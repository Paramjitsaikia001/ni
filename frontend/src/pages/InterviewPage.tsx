import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import Navbar from "../components/LandingPage/Navbar";

/* ─── Types ─── */
type Speaker = "AI" | "User";

interface TranscriptLine {
  speaker: Speaker;
  text: string;
  time: string;
}

interface SessionInfoRow {
  label: string;
  value: string;
}

/* ─── AI Orb Visualizer ─── */
interface AIOrbProps {
  isSpeaking: boolean;
}

function AIOrb({ isSpeaking }: AIOrbProps) {
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      {/* Outer pulse rings */}
      {isSpeaking && (
        <>
          <span className="absolute w-36 h-36 rounded-full border border-primary/20 animate-[ping_1.4s_ease-out_infinite]" />
          <span className="absolute w-28 h-28 rounded-full border border-primary/30 animate-[ping_1.4s_ease-out_0.3s_infinite]" />
        </>
      )}
      {/* Static ambient glow */}
      <span
        className="absolute w-32 h-32 rounded-full"
        style={{
          background: isSpeaking
            ? "radial-gradient(circle, hsl(var(--gold)/0.25) 0%, hsl(var(--primary)/0.08) 60%, transparent 100%)"
            : "radial-gradient(circle, hsl(var(--primary)/0.12) 0%, transparent 70%)",
          transition: "background 0.6s ease",
        }}
      />
      {/* Core orb */}
      <div
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500"
        style={{
          background: isSpeaking
            ? "radial-gradient(135deg, hsl(var(--gold)) 0%, hsl(var(--primary)) 60%, hsl(var(--lavender)) 100%)"
            : "radial-gradient(135deg, hsl(var(--primary)/0.6) 0%, hsl(var(--primary)/0.2) 100%)",
          boxShadow: isSpeaking
            ? "0 0 40px hsl(var(--gold)/0.5), 0 0 80px hsl(var(--primary)/0.2)"
            : "0 0 20px hsl(var(--primary)/0.2)",
        }}
      >
        <Volume2 className="w-7 h-7 text-background" />
      </div>

      {/* Sound bars inside orb ring */}
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

/* ─── Waveform Bar ─── */
interface WaveformProps {
  active: boolean;
}

function Waveform({ active }: WaveformProps) {
  return (
    <div className="flex items-center gap-0.75 h-8">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all duration-150"
          style={{
            width: "3px",
            background: "hsl(var(--primary)/0.7)",
            height: active ? `${8 + Math.random() * 22}px` : "4px",
            animation: active
              ? `waveBar 0.5s ease-in-out ${(i % 7) * 0.07}s infinite alternate`
              : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Transcript Entry ─── */
interface TranscriptEntryProps extends TranscriptLine {
  isLatest: boolean;
}

function TranscriptEntry({
  speaker,
  text,
  time,
  isLatest,
}: TranscriptEntryProps) {
  const isAI = speaker === "AI";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      {/* Avatar dot */}
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

/* ─── User Camera Placeholder ─── */
interface UserCameraProps {
  isMuted: boolean;
}

function UserCamera({ isMuted }: UserCameraProps) {
  return (
    <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden border border-border bg-card">
      {/* Background pattern */}
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
            "repeating-linear-gradient(0deg, transparent, transparent 30px, hsl(var(--border)) 30px, hsl(var(--border)) 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, hsl(var(--border)) 30px, hsl(var(--border)) 31px)",
        }}
      />

      {/* Silhouette */}
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
          Camera Off
        </p>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between bg-linear-to-t from-background/80 to-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] text-muted-foreground font-mono">
            You
          </span>
        </div>
        {isMuted && (
          <Badge variant="destructive" className="text-[9px] h-5 px-2">
            <MicOff className="w-2.5 h-2.5 mr-1" /> Muted
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ─── Mock transcript data ─── */
const MOCK_TRANSCRIPT: TranscriptLine[] = [
  {
    speaker: "AI",
    text: "Welcome! I'm your AI interviewer today. Let's start — can you tell me a bit about yourself and your background?",
    time: "0:04",
  },
  {
    speaker: "User",
    text: "Sure! I'm a full-stack engineer with about 4 years of experience, primarily working with React, Node.js, and PostgreSQL.",
    time: "0:18",
  },
  {
    speaker: "AI",
    text: "Great background. Can you walk me through a challenging technical problem you solved recently and how you approached it?",
    time: "0:32",
  },
  {
    speaker: "User",
    text: "Yeah, we had a performance bottleneck in our dashboard — queries were taking 8+ seconds. I profiled the DB and added targeted indexes, bringing it down to under 200ms.",
    time: "0:51",
  },
];

/* ─── Main Interview Page ─── */
export default function Interview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAISpeaking, setIsAISpeaking] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>(
    MOCK_TRANSCRIPT.slice(0, 2),
  );
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulate transcript growing
  useEffect(() => {
    const timers = MOCK_TRANSCRIPT.slice(2).map((entry, i) =>
      setTimeout(
        () => {
          setTranscript((prev) => [...prev, entry]);
          setIsAISpeaking(entry.speaker === "AI");
        },
        (i + 1) * 5000,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const sessionRows: SessionInfoRow[] = [
    { label: "Role", value: "Senior Frontend Engineer" },
    { label: "Stage", value: "Technical Round" },
    {
      label: "Questions",
      value: `${transcript.filter((t) => t.speaker === "AI").length} asked`,
    },
    { label: "Duration", value: formatTime(elapsed) },
  ];

  return (
    <>
      <style>{`
        @keyframes soundBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.4); }
        }
        @keyframes waveBar {
          from { transform: scaleY(0.3); opacity: 0.5; }
          to   { transform: scaleY(1); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .transcript-entry { animation: fadeSlideUp 0.35s ease both; }
      `}</style>

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />

        <main className="flex-1 pt-20 pb-6 px-4">
          <div className="max-w-6xl mx-auto h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="apex-tag">Live Session</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(elapsed)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Recording
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] border-primary/30 text-primary"
                >
                  Job #{id}
                </Badge>
              </div>
            </div>

            {/* Main layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-[calc(100vh-200px)] min-h-130">
              {/* ── Left: AI Panel ── */}
              <div className="flex flex-col gap-4 min-h-0">
                {/* AI Orb card */}
                <div
                  className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 100%)",
                  }}
                >
                  <AIOrb isSpeaking={isAISpeaking} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-body text-lg font-semibold text-secondary-foreground">
                        Apex AI
                      </h2>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isAISpeaking
                            ? "bg-gold/15 text-gold border-gold/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {isAISpeaking ? "Speaking…" : "Listening"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                      {isAISpeaking
                        ? transcript[transcript.length - 1]?.speaker === "AI"
                          ? transcript[transcript.length - 1]?.text
                          : "Processing your answer…"
                        : "Listening to your response…"}
                    </p>
                    <Waveform active={isAISpeaking} />
                  </div>
                </div>

                {/* Transcript */}
                <div className="flex-1 min-h-0 rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-primary">
                        Transcript
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        {transcript.length} exchanges
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>

                  <div
                    ref={transcriptRef}
                    className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border"
                  >
                    {transcript.map((entry, i) => (
                      <div key={i} className="transcript-entry">
                        <TranscriptEntry
                          {...entry}
                          isLatest={i === transcript.length - 1}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right: User Panel ── */}
              <div className="flex flex-col gap-4">
                {/* Camera */}
                <UserCamera isMuted={isMuted} />

                {/* Controls */}
                <div
                  className="rounded-2xl border border-border bg-card p-4 flex items-center justify-center gap-3"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--gold)/0.02) 100%)",
                  }}
                >
                  {/* Mute */}
                  <button
                    onClick={() => setIsMuted((m) => !m)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 ${
                      isMuted
                        ? "bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  {/* End call */}
                  <button
                    onClick={() => setShowEndConfirm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-all duration-200 shadow-[0_4px_20px_hsl(var(--destructive)/0.3)] hover:shadow-[0_6px_28px_hsl(var(--destructive)/0.45)] hover:-translate-y-0.5"
                  >
                    <PhoneOff className="w-4 h-4" />
                    End Interview
                  </button>

                  {/* Volume toggle */}
                  <button
                    className="w-11 h-11 rounded-full flex items-center justify-center border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
                    title="Toggle volume"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Session info card */}
                <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-3">
                  <h4 className="font-mono text-[10px] tracking-widest uppercase text-primary">
                    Session Info
                  </h4>
                  <div className="space-y-2">
                    {sessionRows.map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-secondary-foreground font-medium">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* End interview confirmation overlay */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className="rounded-2xl border border-border bg-card p-8 max-w-sm w-full mx-4 shadow-[0_32px_64px_hsl(var(--background)/0.8)]"
            style={{ animation: "fadeSlideUp 0.25s ease both" }}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/15 border border-destructive/30 mx-auto mb-5">
              <PhoneOff className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-body text-xl font-semibold text-secondary-foreground text-center mb-2">
              End Interview?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
              Your session will be saved and you'll receive a detailed feedback
              report.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEndConfirm(false)}
              >
                Continue
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => navigate("/jobs")}
              >
                End Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
