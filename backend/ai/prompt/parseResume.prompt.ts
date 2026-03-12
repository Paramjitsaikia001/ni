import { PromptTemplate } from "@langchain/core/prompts";

export const parseResumePrompt = new PromptTemplate({
  template: `
You are an AI resume parser.

Your task is to extract structured candidate information from the resume text.

If a field is not found, return null or an empty array. Do not invent details.

Resume Text:
{resume}
`,
  inputVariables: ["resume"]
});