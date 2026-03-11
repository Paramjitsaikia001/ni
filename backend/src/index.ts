import express, { Application, Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); 

import connectDB from './config/db';
import applicationRoutes from './routes/applicationRoutes';
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import interviewRoutes from './routes/interviewRoutes';
import { setupInterviewSocket } from './sockets/interviewSocket';

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

connectDB();

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));


app.use('/api/auth', authRoutes);         
app.use('/api/jobs', jobRoutes);         
app.use('/api/applications', applicationRoutes); 
app.use('/api/interviews', interviewRoutes); 


app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    success: true, 
    status: 'up',
    database: 'connected', 
    message: 'HireGine Backend is live!' 
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
  🧠 AI Pipeline: Gemini Active
  `);
});