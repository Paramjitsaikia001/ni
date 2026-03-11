import { Server, Socket } from 'socket.io';
import { prepareForSpeech } from '../services/tts_stt';

/**
 * Handles the real-time interview logic via WebSockets.
 * This follows the LLM -> TTS -> User -> STT -> LLM flow.
 */
export const setupInterviewSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(` Interview Socket Connected: ${socket.id}`);

    // 1. Join a specific interview session
    socket.on('join_interview', (applicationId: string) => {
      socket.join(applicationId);
      console.log(`User joined interview session: ${applicationId}`);
    });

    // 2. Receive transcribed answer from Frontend
    socket.on('send_answer', async (data: { applicationId: string; answer: string }) => {
      const { applicationId, answer } = data;
      
      console.log(`Received answer for ${applicationId}: ${answer}`);

      // Here the frontend can emit this, and the socket can broadcast a 'processing' state
      socket.emit('ai_thinking');

      /**
       * [HACKATHON TIP]: 
       * Instead of writing the AI logic twice, your Socket can actually 
       * trigger the same logic as your 'submitAnswer' controller.
       */
      socket.emit('answer_received', { status: 'Evaluating...' });
    });

    socket.on('disconnect', () => {
      console.log(`Interview Socket Disconnected: ${socket.id}`);
    });
  });
};