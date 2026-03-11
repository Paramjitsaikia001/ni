// in this schema i will store the interview data for each application

import mongoose  from 'mongoose';

const InterviewSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Types.ObjectId, ref: 'Application', required: true },
  questions: { type: [String], required: true },
  answers: { type: [Object], required: true },
  finalScores: { type: [Number], required: true },
  finalFeedbacks: { type: [String], required: true },
}, { timestamps: true });

export const Interview = mongoose.model('Interview', InterviewSchema);

/**
 * the answers will be like 
 * answer :[
 * {
 * question:string,
 * answer:string,
 * score:number,
 * feedback:string,
 * }
 * ]
 * 
 */