import { Loader2, Volume2 } from 'lucide-react';
import type { SessionPhase } from '../../utils/types';


const aiWindow = ({ phase }: { phase: SessionPhase }) => {
    
  const isSpeaking = phase === "ai-speaking";
  const isProcessing = phase === "processing" || phase === "connecting";
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      {isSpeaking && (
        <>
          <span className="absolute w-36 h-36 rounded-full border border-primary/20 animate-[ping_1.4s_ease-out_infinite]" />
          <span className="absolute w-28 h-28 rounded-full border border-primary/30 animate-[ping_1.4s_ease-out_0.3s_infinite]" />
        </>
      )}
      <span
        className="absolute w-32 h-32 rounded-full"
        style={{
          background: isSpeaking
            ? "radial-gradient(circle, hsl(var(--gold)/0.25) 0%, hsl(var(--primary)/0.08) 60%, transparent 100%)"
            : "radial-gradient(circle, hsl(var(--primary)/0.12) 0%, transparent 70%)",
          transition: "background 0.6s ease",
        }}
      />
      <div
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500"
        style={{
          background: isSpeaking
            ? "radial-gradient(135deg, hsl(var(--gold)) 0%, hsl(var(--primary)) 60%, hsl(var(--lavender)) 100%)"
            : isProcessing
              ? "radial-gradient(135deg, hsl(var(--lavender)/0.8) 0%, hsl(var(--primary)/0.4) 100%)"
              : "radial-gradient(135deg, hsl(var(--primary)/0.6) 0%, hsl(var(--primary)/0.2) 100%)",
          boxShadow: isSpeaking
            ? "0 0 40px hsl(var(--gold)/0.5), 0 0 80px hsl(var(--primary)/0.2)"
            : "0 0 20px hsl(var(--primary)/0.2)",
        }}
      >
        {isProcessing ? (
          <Loader2 className="w-7 h-7 text-background animate-spin" />
        ) : (
          <Volume2 className="w-7 h-7 text-background" />
        )}
      </div>

      {isSpeaking && (
        <div className="absolute bottom-1 flex items-end gap-0.5">
          {([3, 5, 8, 5, 3] as number[]).map((h, i) => (
            <span
              key={i}
              className="w-0.75 rounded-full bg-primary/60"
              style={{
                height: `${h}px`,
                animation: `soundBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default aiWindow