import { evaluateAnswerPrompt } from "../prompt/evaluateAnswer.prompt";
import { genmodel } from "../config/gemini.config";
import { z } from "zod";

const evaluationSchema = z.object({
  score: z.number().min(1).max(10),
  feedback: z.string().min(5),
});

type EvaluationResult = {
  score: number;
  feedback: string;
};

function normalizeEvaluation(raw: any, answer: string | null | undefined): EvaluationResult {
  const safeFeedback =
    typeof raw?.feedback === "string" && raw.feedback.trim().length > 0
      ? raw.feedback.trim()
      : "The answer needs more technical detail. Add specific concepts and examples.";

  let score =
    typeof raw?.score === "number" && Number.isFinite(raw.score)
      ? Math.round(raw.score)
      : 5;

  const normalizedAnswer = String(answer ?? "").toLowerCase().trim();
  const words = normalizedAnswer.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lowConfidencePatterns = [
    "i don't know",
    "dont know",
    "not sure",
    "no idea",
    "sorry",
    "can't say",
    "cannot say",
  ];

  const isLowConfidence = lowConfidencePatterns.some((p) =>
    normalizedAnswer.includes(p),
  );
  const isVeryShort = wordCount < 8;
  const isShort = wordCount < 20;

  // Guardrails: prevent inflated scores for vague/apology-style answers.
  if (isVeryShort) {
    score = Math.min(score, 3);
  } else if (isLowConfidence && isShort) {
    score = Math.min(score, 4);
  } else if (isLowConfidence) {
    score = Math.min(score, 5);
  } else if (isShort) {
    score = Math.min(score, 6);
  }


  if (isLowConfidence || isVeryShort) {
    return {
      score: 1,
      feedback: "You are not familiar with this topic. Focus on learning the basics and practicing explanations."
    };

  }

  score = Math.max(1, Math.min(10, score));

  // Ensure feedback is short (hard cap safety)
  let trimmedFeedback = safeFeedback;
  if (trimmedFeedback.length > 180) {
    trimmedFeedback = trimmedFeedback.slice(0, 180) + "...";
  }

  return {
    score,
    feedback: trimmedFeedback,
  };
}


let queue = Promise.resolve();

// Simple LLM request queue to serialize calls and prevent rate limit issues.
export function enqueueLLM(task: () => Promise<any>) {
  queue = queue.then(() => task()).catch(() => { });
  return queue as Promise<any>;
}

// Safe LLM call with retries for transient errors
async function safeLLMCall(prompt: string, retries = 2) {
  try {
    return await genmodel.invoke(prompt);
  } catch (err: any) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 1500));
      return safeLLMCall(prompt, retries - 1);
    }
    throw err;
  }
}


export async function evaluateAnswer(question: string, answer: string) {


  const normalizedAnswer = String(answer ?? "").toLowerCase();

  const lowConfidencePatterns = [
    "i don't know",
    "dont know",
    "not sure",
    "no idea",
    "sorry",
  ];

  const isLowConfidence = lowConfidencePatterns.some(p =>
    normalizedAnswer.includes(p)
  );

  const isVeryShort = normalizedAnswer.split(/\s+/).length < 8;

  if (isLowConfidence || isVeryShort) {
    return {
      score: 1,
      feedback: "You are not familiar with this topic. Focus on learning the basics."
    };
  }


  const prompt = await evaluateAnswerPrompt.format({
    question,
    answer
  });

  // console.log("Prompt sent to LLM:\n", prompt);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  await delay(800); // 0.8 sec gap between requests


  const response = await enqueueLLM(() => {
    return safeLLMCall(prompt);
  })


  try {
    let textResponse = response.content as string;

    // Sometimes Gemini wraps JSON in markdown blocks
    if (textResponse.includes("```json")) {
      textResponse = textResponse.split("```json")[1].split("```")[0];
    } else if (textResponse.includes("```")) {
      textResponse = textResponse.split("```")[1].split("```")[0];
    }

    // Extremely robust fallback: Extract the first JSON object using Regex
    const jsonMatch = textResponse.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      textResponse = jsonMatch[0];
    }

    const parsed = JSON.parse(textResponse.trim());

    const validated = evaluationSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("Zod validation failed:", validated.error);
      return {
        score: 5,
        feedback: "The answer needs more technical detail. Add specific concepts and examples.",
      };
    }

    return normalizeEvaluation(validated.data, answer);

  } catch (error) {
    console.error("Answer Evaluation Parse Error:", error, response.content);
    return {
      score: 5,
      feedback: "Thank you for your answer."
    };
  }
}
