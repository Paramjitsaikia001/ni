import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionAnswer {
  question: string;
  answer?: string;
  evaluation?: string; 
  score?: number;      
}

// Main interface for the Application document
export interface IApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  candidateName: string;
  candidateEmail: string;
  resumeUrl: string;       
  matchScore?: number;     
  matchReasoning?: string; 
  interviewData: IQuestionAnswer[]; 
  finalScore?: number;     
  status: 'Applied' | 'Interviewing' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema for the Q&A array
const QuestionAnswerSchema = new Schema<IQuestionAnswer>({
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  evaluation: { type: String, default: '' },
  score: { type: Number, default: 0 }
}, { _id: false }); 

// Main Mongoose Schema for the Application
const ApplicationSchema: Schema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  resumeUrl: { type: String, required: true },
  matchScore: { type: Number, default: 0 },
  matchReasoning: { type: String, default: '' },
  interviewData: { type: [QuestionAnswerSchema], default: [] },
  finalScore: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Applied', 'Interviewing', 'Completed'], 
    default: 'Applied' 
  }
}, { timestamps: true });

export default mongoose.model<IApplication>('Application', ApplicationSchema);