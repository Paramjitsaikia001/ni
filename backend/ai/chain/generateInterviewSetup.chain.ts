import { z } from "zod";
import { genmodel } from "../config/gemini.config";
import { PromptTemplate } from "@langchain/core/prompts";

export const combinedPrompt = new PromptTemplate({
  template: `
You are an expert technical AI recruiter.
Your task is to analyze a candidate's Resume strictly against a Job Description, extract structured details for both, and then formulate 5 tailored interview questions.

Rules for Questions:
1. Question 1: Ask about one specific skill from the candidate's resume.
2. Question 2: Ask about the candidate's work experience. If experience is not provided, ask a beginner-level technical question related to the job description.
3. Questions 3-5: Ask deeper technical questions related to the required skills and technologies in the job description.
4. Make each question distinct and conversational.

Candidate Information:
Name: {name}
Years of Experience: {experience}

Resume Text:
{resume}

Job Description Text:
{jobDescription}
  `,
  inputVariables: ["name", "experience", "resume", "jobDescription"]
});

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

const jdSchema = z.object({
  jobTitle: z.string().nullable().describe("The title of the job"),
  requiredSkills: z.array(z.string()).default([]).describe("Required skills mentioned in the job description"),
  preferredSkills: z.array(z.string()).default([]).describe("Preferred or nice-to-have skills"),
  experienceRequired: z.string().nullable().describe("Required years of experience"),
  technologies: z.array(z.string()).default([]).describe("Technologies strictly mentioned in the description"),
  responsibilities: z.array(z.string()).default([]).describe("List of core responsibilities")
});

export const megaSchema = z.object({
  parsedResume: resumeSchema.describe("Structured details extracted from the candidate's raw Resume"),
  parsedJobDescription: jdSchema.describe("Structured details extracted from the raw Job Description"),
  questions: z.array(z.string()).describe("Exactly 5 interview questions generated specifically from the extracted info")
});

export async function generateInterviewSetup(name: string, experience: number, resume: string, jobDescription: string) {
    const prompt = await combinedPrompt.format({
        name,
        experience,
        resume,
        jobDescription
    });

    try {
        const structuredModel = genmodel.withStructuredOutput(megaSchema);
        const parsed = await structuredModel.invoke(prompt);
        return parsed;
    } catch (error) {
        console.error("Mega setup Parse Error:", error);
        throw new Error("Invalid structured JSON response returned from AI Mega-Chain");
    }
}
