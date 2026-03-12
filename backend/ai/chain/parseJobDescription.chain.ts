import { z } from "zod";
import { parseJobDescriptionPrompt } from "../prompt/parseJobDescription.prompt.ts";
import { genmodel } from "../config/gemini.config.ts";

const jdSchema = z.object({
  jobTitle: z.string().nullable().describe("The title of the job"),
  requiredSkills: z.array(z.string()).default([]).describe("Required skills mentioned in the job description"),
  preferredSkills: z.array(z.string()).default([]).describe("Preferred or nice-to-have skills"),
  experienceRequired: z.string().nullable().describe("Required years of experience"),
  technologies: z.array(z.string()).default([]).describe("Technologies strictly mentioned in the description"),
  responsibilities: z.array(z.string()).default([]).describe("List of core responsibilities")
});

export async function parseJobDescription(jobDescription: string) {
    const prompt = await parseJobDescriptionPrompt.format({
        jobDescription
    });

    try {
        const structuredModel = genmodel.withStructuredOutput(jdSchema);
        const parsed = await structuredModel.invoke(prompt);
        return parsed;
    } catch (error) {
        console.error("JD Parse Error:", error);
        throw new Error("Invalid JSON job description returned from AI");
    }
}