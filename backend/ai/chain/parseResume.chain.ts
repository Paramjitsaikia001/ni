import { z } from "zod";
import { genmodel } from "../config/gemini.config";
import { parseResumePrompt } from "../prompt/parseResume.prompt";

const resumeSchema = z.object({
  name: z.string().nullable().describe("The candidate's full name"),
  email: z.string().nullable().describe("The candidate's email address"),
  phone: z.string().nullable().describe("The candidate's phone number"),
  skills: z.array(z.string()).default([]).describe("An array of technical skills"),
  experienceYears: z.string().nullable().describe("Total years of experience if mentioned"),
  projects: z.array(
    z.object({
      name: z.string().describe("The name of the project"),
      technologies: z.array(z.string()).default([]).describe("Technologies used in the project")
    })
  ).default([]).describe("An array of project objects with name and technologies used"),
  education: z.string().nullable().describe("Education history mentioned"),
  certifications: z.array(z.string()).default([]).describe("Certifications if mentioned")
});

export async function parseResumeChain(resume: string) {
    const prompt = await parseResumePrompt.format({
        resume
    });

    try {
        const structuredModel = genmodel.withStructuredOutput(resumeSchema);
        const parsed = await structuredModel.invoke(prompt);
        return parsed;
    } catch (error) {
        console.error("Resume Parse Error:", error);
        throw new Error("Invalid JSON resume response returned from AI");
    }
}