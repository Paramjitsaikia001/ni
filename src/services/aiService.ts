import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini with your API Key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


export const generateInitialQuestion = async (resumeText: string, jobDescription: string) => {
  const prompt = `
    You are an expert technical interviewer. 
    Job Description: ${jobDescription}
    Candidate Resume: ${resumeText}
    
    Based on the resume and the job requirements, generate ONE high-level technical 
    opening question to start the interview. Keep it concise.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
};


export const evaluateAndContinue = async (
  question: string, 
  answer: string, 
  jobDescription: string
) => {
  const prompt = `
    Job Context: ${jobDescription}
    Question Asked: ${question}
    Candidate's Answer: ${answer}

    Task:
    1. Score the answer from 1 to 10.
    2. Provide a 1-sentence feedback.
    3. Generate the NEXT logical interview question.

    Return the response strictly in this JSON format:
    {
      "score": number,
      "feedback": "string",
      "nextQuestion": "string"
    }
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Clean the response in case Gemini adds markdown code blocks
  const cleanJson = responseText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleanJson);
};