type Speaker = "AI" | "User";

type SessionPhase =
  | "connecting"
  | "ai-speaking"
  | "user-recording"
  | "processing"
  | "ended";

interface TranscriptLine {
  speaker: Speaker;
  text: string;
  time: string;
}

export type { Speaker, SessionPhase, TranscriptLine };