import mongoose from 'mongoose';
import connectDB from './src/config/db';
import { Interview } from './src/models/Interview';
import dotenv from 'dotenv';

dotenv.config();

async function checkDB() {
    await connectDB();
    console.log("Connected to MongoDB.");

    // get the latest interview
    const latest = await Interview.findOne().sort({ createdAt: -1 });
    if (!latest) {
        console.log("No interviews found.");
        process.exit(0);
    }
    
    console.log(`Latest Interview ID: ${latest._id}`);
    console.log(`Questions Count: ${latest.questions.length}`);
    console.log(`Answers Count: ${latest.answers.length}`);
    if (latest.answers.length > 0) {
        const lastAns = latest.answers[latest.answers.length - 1];
        console.log("Last Answer Transcript:", (lastAns as any).transcript);
        console.log("Last Answer Score:", (lastAns as any).score);
        console.log("Last Answer Feedback:", (lastAns as any).feedback);
    }
    
    process.exit(0);
}

checkDB();
