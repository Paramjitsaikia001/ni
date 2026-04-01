import { evaluateAnswer } from "./ai/chain/evaluateAnswer.chain";
import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
    console.log("Starting Evaluation Test...");
    try {
        const question = "Your resume mentions extensive experience with React.js and Tailwind CSS. Can you walk me through a specific instance where you leveraged Tailwind CSS to create a complex responsive layout for a project?";
        const answer = "I use CSS in a project after was after watching any YouTube video.";
        
        console.log("Invoking Gemini...");
        const result = await evaluateAnswer(question, answer);
        console.log("Result:", result);
    } catch (error) {
        console.error("Test Failed with Exception:", error);
    }
}

runTest();
