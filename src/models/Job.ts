import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  description: string;
  skills: string[];
  experienceLevel: string;
  companyDetails: string;
  expiresAt: Date;
  postedBy: mongoose.Types.ObjectId; // Added for TypeScript
}

const JobSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  skills: { type: [String], required: true },
  experienceLevel: { type: String, required: true },
  companyDetails: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  postedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  } 
}, { timestamps: true });

export default mongoose.model<IJob>('Job', JobSchema);