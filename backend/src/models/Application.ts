import mongoose, { Schema } from 'mongoose';

// Main Mongoose Schema for the Application
const ApplicationSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  candidateDetails: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resumeUrl: { type: String, required: true },
  interviewData: { type: Schema.Types.ObjectId, ref: 'Interview',  },
  status: { 
    type: String, 
    enum: ['Applied', 'Interviewing', 'Completed'], 
    default: 'Applied' 
  }
}, { timestamps: true });

export const Application= mongoose.model('Application', ApplicationSchema);