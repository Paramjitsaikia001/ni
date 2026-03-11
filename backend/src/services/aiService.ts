import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Generates the very first interview question based on Resume + Job Description
 */
export const generateInitialQuestion = async (
  resumeText: string, 
  jobDescription: string,
  experience: number
) => {
  try {
    const prompt = `
      You are an expert technical interviewer. 
      Job Description: ${jobDescription}
      Candidate Resume Snippet: ${resumeText}
      Candidate Years of Experience: ${experience}
      
      Based on their experience level and the job requirements, generate ONE high-level 
      technical opening question to start the interview. 
      If they have low experience, focus on fundamentals. If high, focus on architecture/strategy.
      Keep it concise and professional.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("AI Initial Question Error:", error);
    return "To start off, can you tell me about your most significant technical project and the challenges you faced?";
  }
};

/**
 * Evaluates the current answer and decides the next question.
 * Includes logic to end the interview after 5 questions.
 */
export const evaluateAndContinue = async (
  currentQuestion: string, 
  userAnswer: string, 
  jobDescription: string,
  questionCount: number
) => {
  try {
    // Determine if we should wrap up the interview (Target: 5 questions)
    const isLastQuestion = questionCount >= 5;

    const prompt = `
      Context: Technical Interview for the following role: "${jobDescription}"
      
      Last Question Asked: "${currentQuestion}"
      Candidate's Answer: "${userAnswer}"

      Tasks:
      1. Score the answer from 1 to 10 (as a number).
      2. Provide a 1-sentence feedback/evaluation.
      3. ${isLastQuestion 
          ? "This is the final question. Set 'nextQuestion' to 'COMPLETED'." 
          : "Generate the NEXT logical technical interview question."}

      STRICT REQUIREMENT: Return ONLY a JSON object. No prose, no markdown blocks.
      Format:
      {
        "score": number,
        "feedback": "string",
        "nextQuestion": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Safety check to remove potential markdown backticks
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Evaluation Error:", error);
    return {
      score: 5,
      feedback: "The system had trouble parsing that specific answer.",
      nextQuestion: questionCount >= 5 ? "COMPLETED" : "Can you elaborate more on your technical stack?"
    };
  }
};

/**
 * Helper to clean raw text from resumes (removes extra whitespace/weird chars)
 */
export const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .substring(0, 2000); // Limit context size for API efficiency
};