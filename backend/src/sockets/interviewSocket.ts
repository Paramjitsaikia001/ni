import { Server, Socket } from 'socket.io';
import { Interview } from '../models/Interview';
import { processTextAnswer } from '../../ai/services/interview.services';
import { sarvamTTS } from '../../ai/chain/sarvamTTS.chain';
import { speechToText } from '../../ai/chain/sarvamSTT.chain';

/**
 * Handles the real-time interview logic via WebSockets.
 * This follows the LLM -> TTS -> User -> STT -> LLM flow.
 */
export const setupInterviewSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(` Interview Socket Connected: ${socket.id}`);

    // 1. Join a specific interview session
    socket.on('join_interview', async (rawId: string) => {
      // rawId may be interviewId or applicationId; resolve to interview doc
      socket.join(rawId);
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

    // 2. Receive text answer from Frontend, run Gemini eval only
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
                 const sttText = await speechToText(buffer, mimeType || "audio/webm");
                 if (sttText) transcript = sttText;
             } catch (err) {
                 console.error("STT Error:", err);
             }
          }

          const interviewDoc = await Interview.findById(interviewId);
          if (!interviewDoc) {
            socket.emit('ai_error', { message: 'Interview not found' });
            return;
          }

          const currentIndex = interviewDoc.answers.length;

          const interviewState = {
            interviewId,
            questions: interviewDoc.questions,
            currentIndex
          };

          const result = await processTextAnswer(interviewState, transcript);

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

          io.to(interviewId).emit('ai_feedback', {
            transcript: result.transcript,
            score: result.score,
            feedback: result.feedback
          });

          if (!isCompleted && result.nextQuestion) {
            try {
              const nextAudioBuffer = await sarvamTTS(result.nextQuestion);
              io.to(interviewId).emit('ai_question', {
                question: result.nextQuestion,
                audio: nextAudioBuffer.toString('base64')
              });
            } catch (err) {
              console.error("TTS Error:", err);
              io.to(interviewId).emit('ai_question', {
                question: result.nextQuestion
              });
            }
          }

          if (isCompleted) {
            io.to(interviewId).emit('interview_end');
          }
        } catch (error) {
          console.error('❌ Socket AI Error:', error);
          socket.emit('ai_error', { message: 'Failed to process answer' });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`Interview Socket Disconnected: ${socket.id}`);
    });
  });
};