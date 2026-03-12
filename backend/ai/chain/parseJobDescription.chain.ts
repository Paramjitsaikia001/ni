import { parseJobDescriptionPrompt } from "../prompt/parseJobDescription.prompt.ts";
import { genmodel } from "../config/gemini.config.ts";

export async function parseJobDescription(jobDescription: string) {

    const prompt = await parseJobDescriptionPrompt.format({
        jobDescription
    });

    const result = await genmodel.invoke(prompt);

    const rawContent = result.content as string;
    console.log("Raw AI Job Description Output:", rawContent);
    
    try {
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
        console.log("Parsed Job Description:", parsed)

        return parsed;

    } catch (error) {
        console.error("JD Parse Error:", error);
        throw new Error("Invalid JSON job description returned from AI")
    }
}