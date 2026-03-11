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
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

        // Try to extract JSON object even if extra text exists
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("AI response did not contain a valid JSON object");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        console.log(parsed)

        return parsed;

    } catch (error) {
        throw new Error("Invalid JSON job description returned from AI")
    }
}