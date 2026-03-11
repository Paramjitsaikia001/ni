import { genmodel } from "../config/gemini.config.ts";
import { generateQuestionsPrompt } from "../prompt/generateQuestions.prompt.ts";

export async function generateInterviewQuestions(name: string, experience: number, resume: string, jobDescription: string) {
    const prompt=await generateQuestionsPrompt.format({
        name,
        experience,
        resume,
        jobDescription
    })
    const response = await genmodel.invoke(prompt);
    console.log("raw questions",response.content);
    
   
    try {
        const result= (response.content as string).
        replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

        let parsed;

        try {
            parsed = JSON.parse(result);
        } catch {
            // Fallback: handle numbered list format from LLM
            const questions = result
                .split("\n")
                .map(q => q.trim())
                .filter(q => /^\d+\./.test(q)) // lines starting with "1." "2." etc
                .map(q => q.replace(/^\d+\.\s*/, "").trim());

            parsed = { questions };
        }

        console.log("parsed question", parsed);
        

        // later we store the question in the database, for now we just return it to the client
        return parsed;
        
    } catch (error) {
        throw new Error("Invalid JSON questions response return from AI")
        
    }

}