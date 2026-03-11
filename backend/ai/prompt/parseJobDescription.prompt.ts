import { PromptTemplate } from "@langchain/core/prompts";

export const parseJobDescriptionPrompt = new PromptTemplate({
  template: `
You are a strict data extraction system.

Extract information ONLY from the provided job description.

Do not invent skills, technologies, or responsibilities.

If something is not mentioned, leave it empty.

Return JSON format with these fields:

jobTitle
requiredSkills
preferredSkills
experienceRequired
technologies
responsibilities

Job Description:
{{jobDescription}}
`,
  inputVariables: ["jobDescription"]
});