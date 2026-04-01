import mongoose from 'mongoose';
import connectDB from './src/config/db';
import { Interview } from './src/models/Interview';
import { processTextAnswer } from './ai/services/interview.services';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
    await connectDB();
    const interviewDoc = await Interview.findOne().sort({ createdAt: -1 });
    if (!interviewDoc) return process.exit(0);

    const interviewId = interviewDoc._id.toString();
    const transcript = "I use CSS in a project after was after watching any YouTube video.";
    const currentIndex = interviewDoc.answers.length;
    
    const interviewState = {
        interviewId,
        questions: interviewDoc.questions,
        currentIndex
    };

    console.log("Processing text answer...");
    try {
        const result = await processTextAnswer(interviewState, transcript);
        console.log("Evaluation Result:", result);

        const question = interviewDoc.questions[currentIndex];
        interviewDoc.answers.push({
            question,
            transcript: result.transcript,
            score: result.score,
            feedback: result.feedback
        });
        interviewDoc.finalScores.push(result.score);
        interviewDoc.finalFeedbacks.push(result.feedback);

        console.log("Attempting to save to DB...");
        await interviewDoc.save();
        console.log("Successfully saved!");
    } catch (e) {
        console.error("❌ Save or Eval Failed:", e);
    }
    process.exit(0);
}

runTest();
