import { genmodel } from "../config/gemini.config.ts";
import { parseResumePrompt } from "../prompt/parseResume.prompt.ts";

export async function parseResumeChain(resume:String){
    const prompt = await parseResumePrompt.format({resume})

    const result = await genmodel.invoke(prompt);
    
    try {
        const cleaned = (result.content as string)
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        const parsed = JSON.parse(cleaned);

        return parsed;

    } catch (error) {
        throw new Error("Invalid JSON resume response return from AI")
    }
}