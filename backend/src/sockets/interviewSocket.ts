import { Server, Socket } from 'socket.io';
import { Interview } from '../models/Interview';
import { processTextAnswer } from '../../ai/services/interview.services';

/**
 * Handles the real-time interview logic via WebSockets.
 * This follows the LLM -> TTS -> User -> STT -> LLM flow.
 */
export const setupInterviewSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(` Interview Socket Connected: ${socket.id}`);

    // 1. Join a specific interview session
    socket.on('join_interview', (interviewId: string) => {
      socket.join(interviewId);
      console.log(`User joined interview session: ${interviewId}`);
    });

    // 2. Receive text answer from Frontend, run Gemini eval only
    socket.on(
      'send_answer',
      async (data: { interviewId: string; transcript: string }) => {
        const { interviewId, transcript } = data;

        try {
          socket.emit('ai_thinking');

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

          io.to(interviewId).emit('ai_response', {
            transcript: result.transcript,
            score: result.score,
            feedback: result.feedback,
            nextQuestion: result.nextQuestion,
            isCompleted
          });
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