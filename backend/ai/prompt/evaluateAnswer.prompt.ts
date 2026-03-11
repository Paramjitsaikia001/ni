import { PromptTemplate } from "@langchain/core/prompts";

export const evaluateAnswerPrompt = new PromptTemplate({
  template: `
You are an AI technical interviewer.

Evaluate the candidate's answer based on the question.

Question:
{{question}}

Candidate Answer:
{{answer}}

Evaluate using these criteria:
- technical correctness
- clarity of explanation
- depth of knowledge

Return ONLY valid JSON in this format:

{{
  "score": number,
  "feedback": "short feedback in 1-2 sentences"
}}

Score must be from 1 to 10.

Do not include explanations outside JSON.
`,
  inputVariables: [
    "question",
    "answer"
  ]
});