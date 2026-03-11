import { Server, Socket } from 'socket.io';
import Application from '../models/Application'; // Import your Mongoose model

export const setupInterviewSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    
    // 1. Join and Track
    socket.on('join_interview', async (applicationId: string) => {
      socket.join(applicationId);
      (socket as any).applicationId = applicationId; // Attach ID to socket instance
      
      try {
        // Mark as In-Progress when they start
        await Application.findByIdAndUpdate(applicationId, { status: 'In-Progress' });
        console.log(`📡 Interview Started: ${applicationId}`);
      } catch (err) {
        console.error("Error updating status:", err);
      }
    });

    // 2. Manual Exit (The "Leave" Button)
    socket.on('leave_interview', async () => {
      const appId = (socket as any).applicationId;
      if (appId) {
        await Application.findByIdAndUpdate(appId, { status: 'Abandoned' });
        console.log(`⚠️ User voluntarily left: ${appId}`);
        
        socket.emit('exit_confirmed', { message: "Interview ended. Your progress was saved as incomplete." });
        socket.disconnect(); 
      }
    });

    // 3. Abrupt Disconnect (Tab closed/Internet crash)
    socket.on('disconnect', async () => {
      const appId = (socket as any).applicationId;
      
      if (appId) {
        // Check if it was already marked 'Completed' before doing this
        const app = await Application.findById(appId);
        if (app && app.status !== 'Completed') {
          await Application.findByIdAndUpdate(appId, { status: 'Abandoned' });
          console.log(`❌ Connection Lost (Abandoned): ${appId}`);
        }
      }
    });
  });
};