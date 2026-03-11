import { generateInterviewQuestions } from "../chain/generateQuestions.chain";

export async function generateQuestion(name: string, experience: number, resume: string, jobDescription: string) {
    const question = await generateInterviewQuestions(name, experience, resume, jobDescription);
    return question;
}