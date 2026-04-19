import { useRef, useEffect } from "react";
import type { SessionPhase } from "../../utils/types";

function UserVideo({
  stream,
  cameraError,
  phase,
}: {
  stream: MediaStream | null;
  isMuted: boolean;
  cameraError: boolean;
  phase: SessionPhase;
  isSarvamListening: boolean;
  sttStatus: "connected" | "connecting" | "offline";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRecording = phase === "user-recording";
  const hasVideo =
    !!stream && stream.getVideoTracks().length > 0 && !cameraError;

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div
      className="relative w-full aspect-4/3 rounded-2xl overflow-hidden  h-full border bg-card transition-all duration-300"
      style={{
        borderColor: isRecording
          ? "hsl(var(--gold)/0.5)"
          : "hsl(var(--border))",
        boxShadow: isRecording ? "0 0 24px hsl(var(--gold)/0.15)" : "none",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${hasVideo ? "opacity-100" : "opacity-0"}`}
      />

      {!hasVideo && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, hsl(var(--gold)/0.06) 0%, hsl(var(--background)) 70%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,transparent,transparent 30px,hsl(var(--border)) 30px,hsl(var(--border)) 31px),repeating-linear-gradient(90deg,transparent,transparent 30px,hsl(var(--border)) 30px,hsl(var(--border)) 31px)",
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--gold)/0.15), hsl(var(--card)))",
                border: "1px solid hsl(var(--gold)/0.2)",
              }}
            >
              <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16">
                <circle
                  cx="32"
                  cy="22"
                  r="11"
                  fill="hsl(var(--muted-foreground)/0.3)"
                />
                <path
                  d="M10 56c0-12.15 9.85-22 22-22s22 9.85 22 22"
                  stroke="hsl(var(--muted-foreground)/0.3)"
                  strokeWidth="2"
                  fill="hsl(var(--muted-foreground)/0.15)"
                />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase">
              {cameraError ? "Camera unavailable" : "Connecting…"}
            </p>
          </div>
        </>
      )}

      {isRecording && (
        <span className="absolute inset-0 rounded-2xl border-2 border-gold/40 pointer-events-none animate-[ping_1.5s_ease-out_infinite]" />
      )}

      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between bg-linear-to-t from-background/80 to-transparent">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isRecording ? "bg-gold" : "bg-accent"} animate-pulse`}
          />
          <span className="text-[11px] text-muted-foreground font-mono">
            {isRecording ? "Listening…" : "You"}
          </span>
        </div>
        {/* <div className="flex items-center gap-1.5">
          {isRecording && (
            <Badge className="text-[9px] h-5 px-2 border-gold/30 bg-gold/15 text-gold">
              <Mic className="w-2.5 h-2.5 mr-1" /> Live
            </Badge>
          )}
          {isSarvamListening && (
            <Badge className="text-[9px] h-5 px-2 border-primary/30 bg-primary/15 text-primary">
              STT
            </Badge>
          )}

          {sttStatus === "connecting" && (
            <Badge className="text-[9px] h-5 px-2 border-amber-300/30 bg-amber-300/15 text-amber-500">
              STT Reconnecting
            </Badge>
          )}

          {sttStatus === "offline" && (
            <Badge variant="destructive" className="text-[9px] h-5 px-2">
              STT Offline
            </Badge>
          )}

          {isMuted && (
            <Badge variant="destructive" className="text-[9px] h-5 px-2">
              <MicOff className="w-2.5 h-2.5 mr-1" /> Muted
            </Badge>
          )}
        </div> */}
      </div>
    </div>
  );
}

export default UserVideo;
