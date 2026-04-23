import { Server, Socket } from 'socket.io';
import { Interview } from '../models/Interview';
import { processTextAnswer } from '../../ai/services/interview.services';
import { sarvamTTS } from '../../ai/chain/sarvamTTS.chain';
import { speechToText } from '../../ai/chain/sarvamSTT.chain';
import { SarvamAIClient } from 'sarvamai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const toQuestionText = (q: unknown): string => {
  if (typeof q === 'string') return q;
  if (q && typeof q === 'object') {
    const obj = q as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.question === 'string') return obj.question;
    if (typeof obj.prompt === 'string') return obj.prompt;
  }
  return "";
};

/**
 * Handles the real-time interview logic via WebSockets.
 * This follows the LLM -> TTS -> User -> STT -> LLM flow.
 */
export const setupInterviewSocket = (io: Server) => {

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
    let bufferedMimeType = "audio/webm";
    let lastProcessTime = Date.now();
    let partialTranscript = "";
    let lastFinalStt: { audioHash: string; transcript: string } | null = null;
    let pendingFinalStt: { audioHash: string; promise: Promise<string> } | null = null;

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

        const streamingConnectArgs: any = {
          model: "saaras:v2.5",
          mode: "transcribe",
          "language-code": "en-IN",
          high_vad_sensitivity: "true"
        };
        sarvamSocket = await sarvamClient.speechToTextStreaming.connect(streamingConnectArgs);

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
      if (!interviewId || !audio) return;

      // ✅ Only store chunks (no STT processing here)
      const chunkBuffer = Buffer.from(audio, "base64");
      audioChunks.push(chunkBuffer);
      if (mimeType) {
        bufferedMimeType = mimeType;
      }
    });

    socket.on("final_answer", async (data: { interviewId: string; audioBase64?: string; mimeType?: string }) => {
      const { interviewId, audioBase64, mimeType } = data;
      if (!interviewId) {
        socket.emit("stt_error", { error: "Missing interviewId for final_answer" });
        return;
      }

      try {
        const finalBuffer = audioBase64
          ? Buffer.from(audioBase64, "base64")
          : (audioChunks.length > 0 ? Buffer.concat(audioChunks) : Buffer.alloc(0));
        const finalMimeType = mimeType || bufferedMimeType || "audio/webm";
        const finalAudioHash = crypto.createHash("sha256").update(finalBuffer).digest("hex");
        audioChunks = [];
        bufferedMimeType = "audio/webm";
        console.log("Final STT payload", { bytes: finalBuffer.length, mimeType: finalMimeType, socketId: socket.id });

        let finalText = "";
        const finalSttPromise = (async () => {
          if (finalBuffer.length > 0) {
            return await speechToText(finalBuffer, finalMimeType);
          }
          console.log("Skipping STT due to empty audio payload", { bytes: finalBuffer.length, socketId: socket.id });
          return "";
        })();
        pendingFinalStt = {
          audioHash: finalAudioHash,
          promise: finalSttPromise,
        };
        finalText = await finalSttPromise;

        lastFinalStt = {
          audioHash: finalAudioHash,
          transcript: finalText || "",
        };
        pendingFinalStt = null;

        socket.emit("final_transcript", finalText);
        socket.emit("stt_transcript", finalText);
      } catch (err) {
        console.error("Final STT error:", err);
        pendingFinalStt = null;
        socket.emit("stt_error", { error: "Final STT REST call failed" });
      } finally {
        audioChunks = [];
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
              const audioHash = crypto.createHash("sha256").update(buffer).digest("hex");

              // Save audio to uploads/user-ans/
              const ext = (mimeType || "audio/webm").includes("mp3") ? "mp3" : (mimeType || "").includes("wav") ? "wav" : "webm";
              const ansDir = path.join(process.cwd(), 'uploads', 'user-ans');
              if (!fs.existsSync(ansDir)) {
                fs.mkdirSync(ansDir, { recursive: true });
              }
              const filename = `ans_${interviewId}_${Date.now()}.${ext}`;
              fs.writeFileSync(path.join(ansDir, filename), buffer);
              console.log(`💾 Saved user audio answer to: uploads/user-ans/${filename}`);

              const canReuseFinalStt = !!lastFinalStt && lastFinalStt.audioHash === audioHash;
              const canAwaitPendingFinalStt = !!pendingFinalStt && pendingFinalStt.audioHash === audioHash;
              if (canReuseFinalStt) {
                transcript = lastFinalStt?.transcript || transcript;
                console.log("♻️ Reused final_answer STT result for send_answer");
              } else if (canAwaitPendingFinalStt) {
                const pendingText = await pendingFinalStt!.promise;
                transcript = pendingText || transcript;
                console.log("⏳ Awaited pending final_answer STT result for send_answer");
              } else if (!transcript || transcript.trim().length === 0) {
                const sttText = await speechToText(buffer, mimeType || "audio/webm");
                if (sttText) {
                  transcript = sttText;
                  console.log(`🎙️  STT Transcript: "${sttText}"`);
                }
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
          const currentQuestion = interviewDoc.questions[currentIndex];
          const currentQuestionText = typeof currentQuestion === 'string'
            ? currentQuestion
            : (currentQuestion as any)?.text || String(currentQuestion || "");

          if (!transcript || transcript.trim().length === 0) {
            const retryText = "I could not hear your answer clearly. Please repeat your response.";
            try {
              const retryAudioBuffer = await sarvamTTS(`${retryText} ${currentQuestionText}`);
              io.to(roomKey).emit('ai_feedback', {
                feedback: retryText
              });
              io.to(roomKey).emit('ai_question', {
                question: currentQuestionText,
                audio: retryAudioBuffer.toString('base64')
              });
            } catch {
              io.to(roomKey).emit('ai_feedback', {
                feedback: retryText
              });
              io.to(roomKey).emit('ai_question', {
                question: currentQuestionText
              });
            }
            return;
          }

          // Send the final transcript actually used for evaluation back to client.
          socket.emit("user_transcript", { text: transcript });

          const interviewState = {
            interviewId,
            questions: interviewDoc.questions,
            currentIndex
          };

          const result = await processTextAnswer(currentQuestionText, interviewState, transcript);

          console.log(`\n==================== AI EVALUATION ====================`);
          console.log(`Question: ${currentQuestionText}`);
          console.log(`Candidate Answer: ${transcript}`);
          console.log(`Answer Score: ${result.score}/10`);
          console.log(`Feedback: ${result.feedback}`);
          console.log(`=======================================================\n`);

          const question = interviewDoc.questions[currentIndex];
          interviewDoc.answers.push({
            question,
            answer: transcript,
            transcript: transcript,
            score: result.score,
            feedback: result.feedback
          });
          interviewDoc.finalScores.push(result.score);
          interviewDoc.finalFeedbacks.push(result.feedback);

          const isCompleted = currentIndex + 1 >= interviewDoc.questions.length;

          await interviewDoc.save();

                    // 🔍 Debug: Log the latest saved interview result
          console.log("\n🧾 Latest Interview Saved:");
          console.log(JSON.stringify({
            interviewId: interviewDoc._id,
            totalQuestions: interviewDoc.questions.length,
            totalAnswers: interviewDoc.answers.length,
            answers: interviewDoc.answers.map((ans, i) => ({
              qNo: i + 1,
              question: ans.question,
              answer: ans.transcript,
              score: ans.score,
              feedback: ans.feedback
            })),
            averageScore:
              interviewDoc.finalScores.reduce((a, b) => a + b, 0) /
              (interviewDoc.finalScores.length || 1)
          }, null, 2));
          console.log("=========================================\n");


          const nextIndex = currentIndex + 1;
          const nextQuestionText = toQuestionText(interviewDoc.questions[nextIndex]);

          if (!nextQuestionText && !isCompleted) {
            console.error("❌ Next question missing at index:", currentIndex + 1);
          }
          if (!isCompleted && nextQuestionText) {

            try {
              // First speak feedback
              const feedbackAudio = await sarvamTTS(result.feedback);

              io.to(roomKey).emit('ai_feedback', {
                feedback: result.feedback,
                audio: feedbackAudio.toString('base64')
              });


              const delayMs = Math.max(2000, result.feedback.length * 40); // dynamic delay
              await new Promise((res) => setTimeout(res, delayMs));

              // Then speak question separately (prevents truncation)
              const questionAudio = await sarvamTTS(nextQuestionText);

              io.to(roomKey).emit('ai_question', {
                question: nextQuestionText,
                audio: questionAudio.toString('base64')
              });

            } catch (err) {
              console.error("TTS Error:", err);

              io.to(roomKey).emit('ai_question', {
                question: nextQuestionText
              });
            }
          }

          if (isCompleted) {
            try {
              // 🎯 Random ending messages
              const endingMessages = [
                "Thank you for your time. The interview is now complete. You may end the call.",
                "That concludes the interview. Thank you for your responses.",
                "We’ve reached the end of the interview. Thanks for participating.",
                "Interview completed successfully. You can now end the session.",
                "Thanks for answering all the questions. This interview is now finished."
              ];

              const randomEndMessage =
                endingMessages[Math.floor(Math.random() * endingMessages.length)];

              // 1. Speak feedback first
              const feedbackAudio = await sarvamTTS(result.feedback);

              io.to(roomKey).emit('ai_feedback', {
                feedback: result.feedback,
                audio: feedbackAudio.toString('base64')
              });

              // 2. Dynamic delay
              const delayMs = Math.max(2000, result.feedback.length * 40);
              await new Promise((res) => setTimeout(res, delayMs));

              // 3. Speak random ending message
              const endAudio = await sarvamTTS(randomEndMessage);

              io.to(roomKey).emit('ai_question', {
                question: randomEndMessage,
                audio: endAudio.toString('base64'),
                isEnd: true
              });

            } catch (err) {
              console.error("TTS Error:", err);

              io.to(roomKey).emit('ai_feedback', {
                feedback: result.feedback
              });

              io.to(roomKey).emit('ai_question', {
                question: "Interview completed. You may end the call.",
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

    socket.on('disconnect', (reason) => {
      console.log(`Interview Socket Disconnected: ${socket.id}`, reason);
      closeSarvamSocket();
    });
  });
};
