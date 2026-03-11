import express, { Application, Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import connectDB from './src/config/db';

import applicationRoutes from './src/routes/applicationRoutes';
import authRoutes from './src/routes/authRoutes';
import jobRoutes from './src/routes/jobRoutes';
import interviewRoutes from './src/routes/interviewRoutes';

import { setupInterviewSocket } from './src/sockets/interviewSocket';

dotenv.config();

const app: Application = express();
const PORT = 3000;


app.use(cors()); 
app.use(express.json());


connectDB();

// Serve generated interview audio files (questions + feedback)
app.use('/upload', express.static(path.join(process.cwd(), 'upload')));

app.use('/api/auth', authRoutes);         
app.use('/api/jobs', jobRoutes);         
app.use('/api/applications', applicationRoutes); 
app.use('/api/interview', interviewRoutes);


app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    success: true, 
    message: 'HireGine Backend is officially production-ready!' 
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

setupInterviewSocket(io);

server.listen(PORT, () => {
  console.log(`
  🚀 Server is running on http://localhost:${PORT}
  📁 Resumes: http://localhost:${PORT}/uploads
  📡 WebSockets: Enabled
  🧠 AI Pipeline: Gemini 1.5 Flash Active
  `);
});