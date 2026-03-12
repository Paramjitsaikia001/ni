import { evaluateAnswerPrompt } from "../prompt/evaluateAnswer.prompt.ts";
import { genmodel } from "../config/gemini.config.ts";

export async function evaluateAnswer(question: string, answer: string) {

  const prompt = await evaluateAnswerPrompt.format({
    question,
    answer
  });

  const response = await genmodel.invoke(prompt);

  try {
        let textResponse = response.content as string;
        
        // Sometimes Gemini wraps JSON in markdown blocks
        if (textResponse.includes("```json")) {
            textResponse = textResponse.split("```json")[1].split("```")[0];
        } else if (textResponse.includes("```")) {
            textResponse = textResponse.split("```")[1].split("```")[0];
        }

        // Extremely robust fallback: Extract the first JSON object using Regex
        const jsonMatch = textResponse.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            textResponse = jsonMatch[0];
        }

        const parsed = JSON.parse(textResponse.trim());

        // later we store the question in the database, for now we just return it to the client
        return parsed;
        
    } catch (error) {
        console.error("Answer Evaluation Parse Error:", error, response.content);
        return {
            score: 5,
            feedback: "Thank you for your answer."
        };
    }
}