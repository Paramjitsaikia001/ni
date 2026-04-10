import { evaluateAnswer } from "../chain/evaluateAnswer.chain.ts";

function toQuestionText(q: unknown): string {
  if (typeof q === "string") return q;
  if (q && typeof q === "object") {
    const obj = q as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.question === "string") return obj.question;
    if (typeof obj.prompt === "string") return obj.prompt;
  }
  return "";
}

export async function startInterview(interview: { questions: string[] }) {
  const question = toQuestionText(interview.questions[0] ?? "");
  return { question };
}

//  backend only evaluates text answers
export async function processTextAnswer(
  questionInput: string,
  interview: { questions: unknown[]; currentIndex: number },
  transcript: string
){
  const currentIndex = interview.currentIndex;
  const question = questionInput;

  const evaluation = await evaluateAnswer(question, transcript);

  interview.currentIndex += 1;
  const nextQuestion = toQuestionText(interview.questions[interview.currentIndex]);

  console.log("evaluation result in inveterview.services.ts", evaluation);
  console.log("next question in inveterview.services.ts", nextQuestion);
  console.log("transcript in inveterview.services.ts", transcript);

  return {
    transcript,
    score: evaluation.score,
    feedback: evaluation.feedback,
    nextQuestion: nextQuestion ?? null,
  };
}
