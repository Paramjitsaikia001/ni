import { genmodel } from "../config/gemini.config.ts";
import { parseResumePrompt } from "../prompt/parseResume.prompt.ts";

export async function parseResumeChain(resume:String){
    const prompt = await parseResumePrompt.format({resume})

    const result = await genmodel.invoke(prompt);
    
    try {
        const rawContent = result.content as string;
        const cleaned = rawContent
            .replace(/```(json)?/gi, "")
            .replace(/```/g, "")
            .trim();
        
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error("AI response did not contain a valid JSON object");
        }

        const jsonString = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonString);

        return parsed;

    } catch (error) {
        console.error("Resume Parse Error:", error);
        throw new Error("Invalid JSON resume response return from AI")
    }
}