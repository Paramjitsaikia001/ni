import { Server, Socket } from 'socket.io';
import { Interview } from '../models/Interview';
import { processTextAnswer } from '../../ai/services/interview.services';
import { sarvamTTS } from '../../ai/chain/sarvamTTS.chain';
import { speechToText } from '../../ai/chain/sarvamSTT.chain';
import { SarvamAIClient } from 'sarvamai';
import fs from 'fs';
import path from 'path';

/**
 * Handles the real-time interview logic via WebSockets.
 * This follows the LLM -> TTS -> User -> STT -> LLM flow.
 */
export const setupInterviewSocket = (io: Server) => {
  console.log("SARVAM KEY:", process.env.SARVAM_API_KEY);

  const sarvamClient = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY!,
  });

  const formatSarvamError = (err: any) => {
    if (!err) return "Unknown Sarvam error";
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    if (err.type) return `ErrorEvent type=${err.type}`;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };

  io.on('connection', (socket: Socket) => {
    console.log(` Interview Socket Connected : ${socket.id}`);

    const useSarvamStreaming = false; // switched off: prefer robust REST chunk buffering

    let sarvamSocket: any = null;
    let sarvamActive = false;
    let sarvamInitAttempts = 0;
    let sarvamInitCooldown: NodeJS.Timeout | null = null;
    let sarvamInitInProgress = false;

    // Real-time REST-based STT buffering state per socket
    let audioChunks: Buffer[] = [];
    let lastProcessTime = Date.now();
    let partialTranscript = "";

    const closeSarvamSocket = () => {
      if (sarvamSocket) {
        try {
          sarvamSocket.close();
        } catch (e) {
          // swallow any close errors
          console.log("Error to close sarvamSocket", e);

        }
      }
      sarvamSocket = null;
      sarvamActive = false;
    };

    const initSarvamSocket = async () => {
      if (!useSarvamStreaming) {
        return null;
      }

      const isOpen = sarvamSocket && sarvamActive;
      if (isOpen && sarvamActive) {
        return sarvamSocket;
      }

      // prevent multiple concurrent inits
      if (sarvamInitInProgress) {
        console.log("Sarvam init already in progress");
        return null;
      }

      if (sarvamInitCooldown) {
        console.warn("Sarvam init is in cooldown, skipping new attempt");
        return null;
      }

      // Clean old socket if present
      if (sarvamSocket) {
        closeSarvamSocket();
      }

      try {
        sarvamInitInProgress = true;

        if (!process.env.SARVAM_API_KEY) {
          throw new Error("SARVAM_API_KEY is missing");
        }

        socket.emit("stt_status", "connecting");

        if (sarvamInitAttempts >= 3) {
          console.warn("Sarvam init attempt limit reached, entering cooldown");
          socket.emit("stt_status", "offline");
          sarvamInitCooldown = setTimeout(() => {
            sarvamInitAttempts = 0;
            sarvamInitCooldown = null;
          }, 15000);
          return null;
        }

        sarvamSocket = await sarvamClient.speechToTextStreaming.connect({
          model: "saaras:v2.5",
          "language-code": "en-IN",
          "Api-Subscription-Key": process.env.SARVAM_API_KEY || "",
        });

        sarvamSocket.on("error", (err: any) => {
          console.error("Sarvam streaming error", formatSarvamError(err), err);
          socket.emit("stt_error", { error: `Sarvam streaming error: ${formatSarvamError(err)}` });
          closeSarvamSocket();
        });

        sarvamSocket.on("close", (code: any, reason: any): void => {
          if (code === 1000 || code?.code === 1000) {
            console.debug("Sarvam stream closed normally (1000)", { code, reason });
          } else {
            console.warn("Sarvam streaming socket closed", { code, reason });
          }

          sarvamActive = false;
          sarvamSocket = null;
          socket.emit("stt_status", "offline");

          // Avoid hot reconnect loops and rely on REST fallback path
          if (useSarvamStreaming) {
            setTimeout(() => {
              initSarvamSocket().catch(() => {
                console.debug("Deferred Sarvam reconnect attempt failed");
              });
            }, 5000);
          }
        });

        // Wait for socket to be READY before returning
        await sarvamSocket.waitForOpen();
        console.log("✅ Sarvam connected and ready");

        sarvamActive = true;
        sarvamInitAttempts = 0;
        socket.emit("stt_status", "connected");
        return sarvamSocket;
      } catch (err) {
        socket.emit("stt_status", "offline");
        closeSarvamSocket();
        sarvamActive = false;
        sarvamInitAttempts += 1;
        console.error("Failed to initialize Sarvam streaming socket", formatSarvamError(err), err);

        if (sarvamInitAttempts >= 3 && !sarvamInitCooldown) {
          console.warn("Sarvam stream init failed 3 times, setting cooldown");
          sarvamInitCooldown = setTimeout(() => {
            sarvamInitAttempts = 0;
            sarvamInitCooldown = null;
          }, 15000);
        }

        // DO NOT throw → streaming is optional in degraded mode
        return null;
      } finally {
        sarvamInitInProgress = false;
      }
    };

    // 1. Join a specific interview session
    socket.on('join_interview', async (rawId: string) => {
      // rawId may be interviewId or applicationId; resolve to interview doc
      socket.join(rawId);
      if (useSarvamStreaming) {
        try {
          await initSarvamSocket();
        } catch {
          console.warn("Sarvam init failed at join, continuing without streaming");
        }
      } else {
        socket.emit("stt_status", "offline");
      }
      console.log(`User joined interview session: ${rawId}`);

      let interviewDoc = await Interview.findById(rawId);
      if (!interviewDoc) {
        // maybe caller passed applicationId
        interviewDoc = await Interview.findOne({ applicationId: rawId });
      }

      if (!interviewDoc) {
        socket.emit("ai_error", { message: "Interview not found" });
        return;
      }

      const firstQuestion = interviewDoc.questions[0];
      const qText = typeof firstQuestion === 'string' ? firstQuestion : (firstQuestion as any).text || firstQuestion;
      try {
        const audioBuffer = await sarvamTTS(qText);
        socket.emit("ai_question", {
          question: qText,
          audio: audioBuffer.toString('base64')
        });
      } catch (err) {
        console.error("TTS Error:", err);
        socket.emit("ai_question", {
          question: qText
        });
      }
    });

    socket.on("audio_chunk", async (data: { interviewId: string; audio: string; mimeType?: string }) => {
      const { interviewId, audio, mimeType } = data;
      if (!interviewId || !audio) {
        return;
      }

      // Append the incoming chunk to buffer
      const chunkBuffer = Buffer.from(audio, "base64");
      audioChunks.push(chunkBuffer);

      const now = Date.now();
      if (now - lastProcessTime > 2000) {
        lastProcessTime = now;

        const batches = audioChunks;
        audioChunks = [];

        if (batches.length === 0) {
          return;
        }

        const sttMimeType = mimeType || "audio/webm";

        let partialChunkText = "";

        // 1) Try combined audio first (for better context)
        if (Buffer.concat(batches).length >= 2000) {
          try {
            const combinedText = await speechToText(Buffer.concat(batches), sttMimeType);
            if (combinedText && combinedText.trim().length > 0) {
              partialChunkText = combinedText.trim();
            }
          } catch (combinedErr) {
            console.warn("Chunk STT combined processing failed, trying per-chunk:", String(combinedErr));
          }
        }

        // 2) Fallback per-chunk when combined audio fails or too short
        if (!partialChunkText) {
          for (const batch of batches) {
            if (batch.length < 2000) continue;
            try {
              const chunkText = await speechToText(batch, sttMimeType);
              if (chunkText && chunkText.trim().length > 0) {
                partialChunkText = `${partialChunkText} ${chunkText}`.trim();
              }
            } catch (chunkErr) {
              console.warn("Chunk STT individual chunk failed:", String(chunkErr));
              continue;
            }
          }
        }

        if (!partialChunkText) {
          return;
        }

        partialTranscript = `${partialTranscript} ${partialChunkText}`.trim();

        socket.emit("partial_transcript", {
          text: partialTranscript,
        });

        // Keep legacy fallback event for compatibility
        socket.emit("stt_transcript", partialTranscript);
      }
    });

    socket.on("final_answer", async (data: { interviewId: string }) => {
      const { interviewId } = data;
      if (!interviewId) {
        socket.emit("stt_error", { error: "Missing interviewId for final_answer" });
        return;
      }

      try {
        const finalBuffer = audioChunks.length > 0 ? Buffer.concat(audioChunks) : Buffer.alloc(0);
        audioChunks = [];

        let finalText = partialTranscript.trim();

        if (finalBuffer.length >= 2000) {
          const chunkText = await speechToText(finalBuffer, "audio/webm");
          if (chunkText && chunkText.trim().length > 0) {
            finalText = `${finalText} ${chunkText}`.trim();
          }
        }

        socket.emit("final_transcript", finalText);
        socket.emit("stt_transcript", finalText);
      } catch (err) {
        console.error("Final STT error:", err);
        socket.emit("stt_error", { error: "Final STT REST call failed" });
      } finally {
        audioChunks = [];
        partialTranscript = "";
        lastProcessTime = Date.now();
      }
    });

    socket.on(
      'send_answer',
      async (data: { interviewId: string; answer?: string; transcript?: string; audioBase64?: string; mimeType?: string }) => {
        const { interviewId, audioBase64, mimeType } = data;
        let transcript = data.transcript || data.answer || "";

        try {
          socket.emit('ai_thinking');

          if (audioBase64) {
            try {
              const buffer = Buffer.from(audioBase64, 'base64');

              // Save audio to uploads/user-ans/
              const ext = (mimeType || "audio/webm").includes("mp3") ? "mp3" : (mimeType || "").includes("wav") ? "wav" : "webm";
              const ansDir = path.join(process.cwd(), 'uploads', 'user-ans');
              if (!fs.existsSync(ansDir)) {
                fs.mkdirSync(ansDir, { recursive: true });
              }
              const filename = `ans_${interviewId}_${Date.now()}.${ext}`;
              fs.writeFileSync(path.join(ansDir, filename), buffer);
              console.log(`💾 Saved user audio answer to: uploads/user-ans/${filename}`);

              const sttText = await speechToText(buffer, mimeType || "audio/webm");
              if (sttText) {
                transcript = sttText;
                console.log(`🎙️  STT Transcript: "${sttText}"`);
              }
            } catch (err) {
              console.error("STT Error:", err);
            }
          }

          let interviewDoc = await Interview.findById(interviewId);
          if (!interviewDoc) {
            interviewDoc = await Interview.findOne({ applicationId: interviewId });
          }

          if (!interviewDoc) {
            socket.emit('ai_error', { message: 'Interview not found' });
            return;
          }

          // The room key used by the client (could be applicationId or interviewId)
          // We must emit back to the SAME room the client joined
          const roomKey = interviewId;

          const currentIndex = interviewDoc.answers.length;

          const interviewState = {
            interviewId,
            questions: interviewDoc.questions,
            currentIndex
          };

          const result = await processTextAnswer(interviewState, transcript);

          console.log(`\n==================== AI EVALUATION ====================`);
          console.log(`Answer Score: ${result.score}/10`);
          console.log(`Feedback: ${result.feedback}`);
          console.log(`=======================================================\n`);

          const question = interviewDoc.questions[currentIndex];
          interviewDoc.answers.push({
            question,
            transcript: result.transcript,
            score: result.score,
            feedback: result.feedback
          });
          interviewDoc.finalScores.push(result.score);
          interviewDoc.finalFeedbacks.push(result.feedback);

          const isCompleted = currentIndex + 1 >= interviewDoc.questions.length;

          await interviewDoc.save();

          if (!isCompleted && result.nextQuestion) {
            try {
              // Combine feedback and next question so AI speaks both
              const combinedText = `${result.feedback} ${result.nextQuestion}`;
              const nextAudioBuffer = await sarvamTTS(combinedText);

              // Emit to the exact room the client joined
              io.to(roomKey).emit('ai_feedback', {
                feedback: result.feedback
              });

              io.to(roomKey).emit('ai_question', {
                question: result.nextQuestion,
                audio: nextAudioBuffer.toString('base64')
              });
            } catch (err) {
              console.error("TTS Error:", err);
              io.to(roomKey).emit('ai_feedback', {
                feedback: result.feedback
              });
              io.to(roomKey).emit('ai_question', {
                question: result.nextQuestion
              });
            }
          }

          if (isCompleted) {
            const endText = `${result.feedback} Thank you for your time. The interview is now complete. You may end the call.`;
            try {
              const endAudioBuffer = await sarvamTTS(endText);
              io.to(roomKey).emit('ai_feedback', {
                feedback: result.feedback
              });
              io.to(roomKey).emit('ai_question', {
                question: "Thank you for your time. The interview is now complete. You may end the call.",
                audio: endAudioBuffer.toString('base64'),
                isEnd: true
              });
            } catch (err) {
              io.to(roomKey).emit('ai_feedback', {
                feedback: result.feedback
              });
              io.to(roomKey).emit('ai_question', {
                question: "Thank you for your time. The interview is now complete. You may end the call.",
                isEnd: true
              });
            }
          }
        } catch (error) {
          console.error('❌ Socket AI Error:', error);
          socket.emit('ai_error', { message: 'Failed to process answer' });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`Interview Socket Disconnected: ${socket.id}`);
      closeSarvamSocket();
    });
  });
};