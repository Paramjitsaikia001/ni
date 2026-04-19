
import type { TranscriptLine } from '../../utils/types';

function TranscriptEntry({
  speaker,
  text,
  time,
  isLatest,
}: TranscriptLine & { isLatest: boolean }) {
  const isAI = speaker === "AI";

  return (
    <div className={` flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      <div
        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[9px] font-mono font-bold mt-0.5 ${
          isAI
            ? "bg-primary/20 text-primary border border-primary/30"
            : "bg-gold/20 text-gold border border-gold/30"
        }`}
      >
        {isAI ? "AI" : "ME"}
      </div>
      <div
        className={`max-w-[82%] ${isAI ? "" : "items-end"} flex flex-col gap-1`}
      >
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isAI
              ? "bg-secondary/60 text-foreground rounded-tl-sm border border-border"
              : "bg-primary/15 text-secondary-foreground rounded-tr-sm border border-primary/20"
          } ${isLatest ? "ring-1 ring-primary/20" : ""}`}
        >
          {text}
          {isLatest && isAI && (
            <span className="inline-block w-1.5 h-4 bg-primary/70 ml-1 rounded-sm animate-[blink_1s_step-end_infinite] align-middle" />
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono px-1">
          {time}
        </span>
      </div>
    </div>
  );
}

export default TranscriptEntry