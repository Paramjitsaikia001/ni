import path from 'path';
import dotenv from 'dotenv';

// 1. Load environment variables immediately
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Debugging: This will tell us if it worked before we even try to connect
console.log("------------------------------------------");
console.log("Environment Check:", process.env.MONGO_URI ? "MONGO_URI Found ✅" : "MONGO_URI Missing ❌");
console.log("------------------------------------------");

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Import Configurations & Routes
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import applicationRoutes from './routes/applicationRoutes';
import { setupInterviewSocket } from './sockets/interviewSocket';

// 2. Connect to MongoDB Atlas
connectDB();

const app = express();
const server = http.createServer(app);

// 3. CORS Configuration
app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 4. Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Static Folder for Resume Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 6. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

// 7. Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Initialize the Interview Brain
setupInterviewSocket(io);

// 8. Base Route for Testing
app.get('/', (req, res) => {
  res.send('HireGine AI Backend is running...');
});

// 9. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io is ready for interviews`);
});