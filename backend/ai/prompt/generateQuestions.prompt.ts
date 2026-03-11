import { PromptTemplate } from "@langchain/core/prompts";

export const generateQuestionsPrompt = new PromptTemplate({
  template: `
You are an AI technical interviewer.

Generate 5 realistic interview questions.


Rules:
1. Question 1: Ask about one of the candidate's skills.
2. Question 2: Ask about the candidate's work experience. If experience is not provided, ask a beginner-level technical question related to the job description.
3. Questions 3-5: Ask deeper technical questions related to the required skills and technologies in the job description.

Use ONLY the following inputs.

Candidate Information:
Name: {{name}}
Years of Experience: {{experience}}

Resume Summary:
{{resume}}

Job Description:
{{jobDescription}}

Return the questions as a numbered list.
`,
  inputVariables: [
    "name",
    "experience",
    "resume",
    "jobDescription"
  ]
});