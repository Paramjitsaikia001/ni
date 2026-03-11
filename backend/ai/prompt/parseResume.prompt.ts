import { PromptTemplate } from "@langchain/core/prompts";

export const parseResumePrompt = new PromptTemplate({
  template: `
You are an AI resume parser.

Your task is to extract structured candidate information from the resume text.

Extract the following fields:

- name
- email
- phone
- skills (array of technical skills)
- experienceYears (total years of experience if mentioned)
- projects (array of project objects with name and technologies used)
- education
- certifications (if mentioned)

Resume Text:
{{resume}}

Return ONLY valid JSON in this format:

{{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "experienceYears": "",
  "projects": [
    {{
      "name": "",
      "technologies": []
}}
  ],
  "education": "",
  "certifications": []
}}

Do not include explanations.
If a field is not found, return null or an empty array.
`,
  inputVariables: ["resume"]
});