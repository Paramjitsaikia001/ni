import { evaluateAnswer } from "../chain/evaluateAnswer.chain.ts";

export async function startInterview(interview: { questions: string[] }) {
  const question = interview.questions[0] ?? "";
  return { question };
}

//  backend only evaluates text answers
export async function processTextAnswer(
  interview: { questions: string[]; currentIndex: number },
  transcript: string
) {
  const currentIndex = interview.currentIndex;
  const question = interview.questions[currentIndex] ?? "";

  const evaluation = await evaluateAnswer(question, transcript);

  interview.currentIndex += 1;
  const nextQuestion = interview.questions[interview.currentIndex];

  return {
    transcript,
    score: evaluation.score,
    feedback: evaluation.feedback,
    nextQuestion: nextQuestion ?? null,
  };
}