import { evaluateAnswerPrompt } from "../prompt/evaluateAnswer.prompt.ts";
import { genmodel } from "../config/gemini.config.ts";

export async function evaluateAnswer(question: string, answer: string) {

  const prompt = await evaluateAnswerPrompt.format({
    question,
    answer
  });

  const response = await genmodel.invoke(prompt);

  try {
        const result= (response.content as string).
        replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

        const parsed = JSON.parse(result);

        // later we store the question in the database, for now we just return it to the client
        return parsed;
        
    } catch (error) {
        throw new Error("Invalid JSON evaluation response return from AI")
        
    }
}