/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Clock,
  ChevronDown,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import Navbar from "../components/LandingPage/Navbar";
import { io, Socket } from "socket.io-client";
import { API_BASE } from "../lib/api";

// socket endpoint can be overridden via env, otherwise default to backend host
const SOCKET_ENDPOINT =
  import.meta.env.VITE_BACKEND_SOCKET ?? "http://localhost:30000";

// debug connection target
console.debug("InterviewPage socket endpoint:", SOCKET_ENDPOINT);

/* ─── Types ─── */
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

/* ─── Browser SpeechRecognition shim ─── */
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition ||
  null;

/* ─── Helpers ─── */
function formatTime(s: number): string {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function elapsedLabel(startedAt: number): string {
  return formatTime(Math.floor((Date.now() - startedAt) / 1000));
}

/* ─── AI Orb ─── */
function AIOrb({ phase }: { phase: SessionPhase }) {
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

// postion :
//skill :
// expre


/* ─── Waveform ─── */
function Waveform({
  active,
  color = "hsl(var(--primary)/0.7)",
  stream = null,
}: {
  active: boolean;
  color?: string;
  stream?: MediaStream | null;
}) {
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!active || !stream || stream.getAudioTracks().length === 0) {
      setVolume(0);
      return;
    }

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let animationId: number;
    
    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength;
      
      // Normalize roughly 0 to 1
      setVolume(Math.min(1, avg / 60));
      animationId = requestAnimationFrame(updateVolume);
    };
    
    updateVolume();
    
    return () => {
      cancelAnimationFrame(animationId);
      source.disconnect();
      audioCtx.close().catch(console.error);
    };
  }, [active, stream]);

  return (
    <div className="flex items-center gap-0.75 h-8">
      {Array.from({ length: 28 }).map((_, i) => {
        // When streaming microphone input, mix generic animation with the live volume magnitude
        const baseHeight = active && !stream ? (8 + Math.random() * 22) : 4;
        const reactiveHeight = stream && active ? 4 + (volume * (10 + Math.random() * 20)) : baseHeight;

        return (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: "3px",
              background: color,
              // eslint-disable-next-line react-hooks/purity
              height: `${reactiveHeight}px`,
              transition: stream ? "height 0.05s ease" : "height 0.15s ease",
              animation: (active && !stream)
                ? `waveBar 0.5s ease-in-out ${(i % 7) * 0.07}s infinite alternate`
                : "none",
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Transcript Entry ─── */
function TranscriptEntry({
  speaker,
  text,
  time,
  isLatest,
}: TranscriptLine & { isLatest: boolean }) {
  const isAI = speaker === "AI";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
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

/* ─── User Video ─── */
function UserVideo({
  stream,
  isMuted,
  cameraError,
  phase,
}: {
  stream: MediaStream | null;
  isMuted: boolean;
  cameraError: boolean;
  phase: SessionPhase;
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
      className="relative w-full aspect-4/3 rounded-2xl overflow-hidden border bg-card transition-all duration-300"
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
        <div className="flex items-center gap-1.5">
          {isRecording && (
            <Badge className="text-[9px] h-5 px-2 border-gold/30 bg-gold/15 text-gold">
              <Mic className="w-2.5 h-2.5 mr-1" /> Live
            </Badge>
          )}
          {isMuted && (
            <Badge variant="destructive" className="text-[9px] h-5 px-2">
              <MicOff className="w-2.5 h-2.5 mr-1" /> Muted
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Phase label ─── */
function phaseLabel(phase: SessionPhase): string {
  switch (phase) {
    case "connecting":
      return "Connecting…";
    case "ai-speaking":
      return "Speaking…";
    case "user-recording":
      return "Listening";
    case "processing":
      return "Processing…";
    case "ended":
      return "Session ended";
  }
}

/* ════════════════════════════════════════
   Main Interview Page
════════════════════════════════════════ */
export default function Interview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // id initially holds applicationId; we convert to interviewId after calling backend
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const fetchRef = useRef(false);

  // kick off interview process on mount
  useEffect(() => {
    if (!id || fetchRef.current) return;
    fetchRef.current = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/interview/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: id }),
        });
        const data = await r.json();
        if (!r.ok || !data.interviewId) {
          throw new Error(data.message || "Failed to start interview");
        }
        setInterviewId(data.interviewId);
      } catch (error: any) {
        console.error("Interview start error", error);
        setError(error.message || "Could not initialize interview");
      }
    })();
  }, [id]);

  /* media */
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);

  /* session */
  const [phase, setPhase] = useState<SessionPhase>("connecting");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [liveAnswer, setLiveAnswer] = useState(""); // interim STT text
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* refs */
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef(Date.now());
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const speakerMutedRef = useRef(false);
  const finalAnswerRef = useRef(""); // accumulates confirmed STT words
  const socketRef = useRef<Socket | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const endSessionRef = useRef<() => void>(() => {});

  /* keep ref in sync */
  useEffect(() => {
    speakerMutedRef.current = speakerMuted;
  }, [speakerMuted]);

  /* ── timer ── */
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── auto-scroll ── */
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript, liveAnswer]);

  /* ── mute mic tracks ── */
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted;
    });
  }, [isMuted, stream]);

  /* ── cleanup ── */
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, [stream]);

  /* ── add a line to transcript ── */
  const addLine = useCallback((speaker: Speaker, text: string) => {
    setTranscript((prev) => [
      ...prev,
      { speaker, text, time: elapsedLabel(sessionStartRef.current) },
    ]);
  }, []);

  /* ══════════════════════════════════
     SPEAK — Callback for AI text/audio
  ══════════════════════════════════ */
  const playAudioBase64 = useCallback((base64: string, onDone: () => void) => {
    if (speakerMutedRef.current) {
        onDone();
        return;
    }
    try {
        const audioSrc = `data:audio/mp3;base64,${base64}`;
        const audio = new Audio(audioSrc);
        audio.onended = onDone;
        audio.onerror = onDone;
        audio.play().catch((err) => {
            console.error("Audio playback error:", err);
            onDone();
        });
    } catch {
        onDone();
    }
  }, []);

  const speak = useCallback((text: string, onDone: () => void) => {
    if (!("speechSynthesis" in window)) {
      onDone();
      return;
    }

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    u.volume = speakerMutedRef.current ? 0 : 1;
    u.onend = onDone;
    u.onerror = onDone;
    window.speechSynthesis.speak(u);
  }, []);

  /* ══════════════════════════════════
     START USER RECORDING (STT)
  ══════════════════════════════════ */
  const startListening = useCallback(() => {
    setPhase("user-recording");
    setLiveAnswer("");
    finalAnswerRef.current = "";
    audioChunksRef.current = [];

    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      recognitionRef.current = rec;

      rec.onresult = (e: any) => {
        let interim = "";
        let final = finalAnswerRef.current;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += (final ? " " : "") + chunk;
          else interim = chunk;
        }
        finalAnswerRef.current = final;
        setLiveAnswer(final + (interim ? " " + interim : ""));
      };

      rec.onerror = () => {
        /* ignore — user can still press Done */
      };
      rec.start();
    }

    // Start recording audio for Sarvam backend STT
    if (stream && stream.getAudioTracks().length > 0) {
        try {
            // Only extract the audio track to prevent recording massive video blobs
            const audioStream = new MediaStream([stream.getAudioTracks()[0]]);
            const recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };
            recorder.start(1000); // 1-second chunks so data is ready when stopped
        } catch (err) {
            console.error("MediaRecorder start failed:", err);
        }
    }
  }, [stream]);

  /* ══════════════════════════════════
     STOP & SUBMIT user's answer
  ══════════════════════════════════ */
  const submitAnswer = useCallback(async () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
            processAndSendSubmission();
        };
        mediaRecorderRef.current.stop();
    } else {
        processAndSendSubmission();
    }

    function processAndSendSubmission() {
        const answer = finalAnswerRef.current.trim() || liveAnswer.trim();
        
        if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" });
            const mimeType = blob.type;
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = (reader.result as string).split(',')[1];
                sendPayload(answer, base64data, mimeType);
            }
        } else {
            if (!answer) return; // nothing to submit
            sendPayload(answer, "", "");
        }
    }

    function sendPayload(answer: string, audioBase64: string, mimeType: string) {
        setLiveAnswer("");
        if (answer) addLine("User", answer);
        else if (audioBase64) addLine("User", "(Audio submitted)");
        setPhase("processing");

        try {
          socketRef.current?.emit("send_answer", {
            interviewId: id,
            answer,
            audioBase64,
            mimeType
          });
        } catch {
          setError("Failed to submit answer. Please check your connection.");
          setPhase("user-recording");
        }
    }
  }, [id, liveAnswer, addLine]);

  /* ══════════════════════════════════
     START SESSION — POST /start
  ══════════════════════════════════ */
  const startSession = useCallback(async () => {
    setPhase("connecting");
    // nothing else; joining is handled in separate effect when interviewId arrives
  }, []);

  /* ── auto-submit on silence ── */
  useEffect(() => {
    if (phase !== "user-recording") return;
    
    // Auto-submit after 4 seconds of silence, but only if they've explicitly started talking
    if (liveAnswer.trim().length > 0) {
        const timeout = setTimeout(() => {
            submitAnswer();
        }, 4000);
        return () => clearTimeout(timeout);
    }
  }, [liveAnswer, phase, submitAnswer]);

  /* ══════════════════════════════════
     END SESSION — GET /summary
  ══════════════════════════════════ */
  const endSession = useCallback(() => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    stream?.getTracks().forEach((t) => t.stop());
    setPhase("ended");
    navigate(`/jobs`);
  }, [stream, id, navigate]);

  // Keep refs up to date
  startListeningRef.current = startListening;
  endSessionRef.current = endSession;

  /* ── socket creation & handlers (runs once) ── */
  useEffect(() => {
    const socket = io(SOCKET_ENDPOINT, {
  transports: ["websocket", "polling"]
});
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Interview Socket Connected:", socket.id);
    });

    socket.on("ai_question", (payload: { question: string; audio?: string; isEnd?: boolean }) => {
      if (!payload?.question) return;
      addLine("AI", payload.question);
      setPhase("ai-speaking");
      if (payload.audio) {
          playAudioBase64(payload.audio, () => {
              if (payload.isEnd) {
                  setTimeout(() => endSessionRef.current(), 3000);
              } else {
                  startListeningRef.current();
              }
          });
      } else {
          speak(payload.question, () => {
              if (payload.isEnd) {
                  setTimeout(() => endSessionRef.current(), 3000);
              } else {
                  startListeningRef.current();
              }
          });
      }
    });

    socket.on("ai_feedback", (payload: { feedback: string }) => {
      if (!payload?.feedback) return;
      addLine("AI", payload.feedback);
    });

    socket.on("interview_end", () => {
      endSessionRef.current();
    });

    socket.on("disconnect", () => {
      console.log("Interview socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
    // handlers use stable refs for addLine etc; if those ever change you may need to update
  }, [addLine, speak, playAudioBase64]);

  /* ── when we know the interviewId, tell server to join ── */
  useEffect(() => {
    if (interviewId && socketRef.current) {
      socketRef.current.emit("join_interview", interviewId);
      console.log("Joining interview session", interviewId);
    }
  }, [interviewId]);

  /* ── Get camera + mic, then start session ── */
  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((ms) => {
        if (!active) {
          ms.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(ms);
        startSession();
      })
      .catch((err: DOMException) => {
        if (!active) return;
        if (err.name === "NotAllowedError") {
          setError(
            "Camera and microphone access denied. Please allow permissions and reload.",
          );
          return;
        }
        setCameraError(true);
        // audio-only fallback
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((ms) => {
            if (active) {
              setStream(ms);
              startSession();
            }
          })
          .catch(() => {
            if (active)
              setError("Microphone access is required for this interview.");
          });
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── derived ─── */
  const isRecording = phase === "user-recording";
  const isSpeaking = phase === "ai-speaking";

  return (
    <>
      <style>{`
        @keyframes soundBar  { from{transform:scaleY(.4)} to{transform:scaleY(1.4)} }
        @keyframes waveBar   { from{transform:scaleY(.3);opacity:.5} to{transform:scaleY(1);opacity:1} }
        @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .transcript-entry    { animation: fadeSlideUp .35s ease both; }
      `}</style>

      {/* Error banner */}
      {error && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center gap-2 bg-destructive/90 text-destructive-foreground text-sm px-6 py-3 backdrop-blur-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button
            className="ml-auto underline text-xs"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar isLoggedIn={true}/>

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
                  Application #{id}
                </Badge>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-[calc(100vh-200px)] min-h-130">
              {/* ── Left: AI Panel ── */}
              <div className="flex flex-col gap-4 min-h-0">
                {/* AI orb */}
                <div
                  className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 100%)",
                  }}
                >
                  <AIOrb phase={phase} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-body text-lg font-semibold text-secondary-foreground">
                        Apex AI
                      </h2>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors duration-300 ${
                          isSpeaking
                            ? "bg-gold/15 text-gold border-gold/30"
                            : isRecording
                              ? "bg-accent/20 text-accent border-accent/30"
                              : phase === "processing"
                                ? "bg-lavender/20 text-lavender border-lavender/30"
                                : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {phaseLabel(phase)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                      {isSpeaking
                        ? (transcript.findLast?.((t) => t.speaker === "AI")
                            ?.text ?? "Preparing question…")
                        : isRecording
                          ? "Speak your answer clearly, then press Done Speaking."
                          : phase === "processing"
                            ? "Submitting your answer…"
                            : phase === "connecting"
                              ? "Starting your interview session…"
                              : "Session complete."}
                    </p>
                    <Waveform
                      active={isSpeaking}
                      color={
                        isRecording
                          ? "hsl(var(--accent)/0.7)"
                          : "hsl(var(--primary)/0.7)"
                      }
                    />
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
                    {transcript.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-muted-foreground font-mono">
                          Starting session…
                        </p>
                      </div>
                    ) : (
                      transcript.map((entry, i) => (
                        <div key={i} className="transcript-entry">
                          <TranscriptEntry
                            {...entry}
                            isLatest={
                              i === transcript.length - 1 && !liveAnswer
                            }
                          />
                        </div>
                      ))
                    )}

                    {/* Live interim answer while user is speaking */}
                    {isRecording && liveAnswer && (
                      <div className="transcript-entry flex gap-3 flex-row-reverse opacity-70">
                        <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[9px] font-mono font-bold mt-0.5 bg-gold/20 text-gold border border-gold/30">
                          ME
                        </div>
                        <div className="max-w-[82%] items-end flex flex-col gap-1">
                          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed bg-primary/10 text-secondary-foreground border border-primary/10 border-dashed">
                            {liveAnswer}
                            <span className="inline-block w-1.5 h-4 bg-gold/60 ml-1 rounded-sm animate-[blink_1s_step-end_infinite] align-middle" />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono px-1">
                            live
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Right: User Panel ── */}
              <div className="flex flex-col gap-4">
                <UserVideo
                  stream={stream}
                  isMuted={isMuted}
                  cameraError={cameraError}
                  phase={phase}
                />

                {/* Controls */}
                <div
                  className="rounded-2xl border border-border bg-card p-4 flex items-center justify-center gap-3"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--gold)/0.02) 100%)",
                  }}
                >
                  {/* Mute mic */}
                  <button
                    onClick={() => setIsMuted((m) => !m)}
                    disabled={!isRecording}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isMuted
                        ? "bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                    title={isMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  {/* Context button */}
                  {isRecording ? (
                    <button
                      onClick={submitAnswer}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: "hsl(var(--gold))",
                        color: "hsl(var(--background))",
                        boxShadow: "0 4px 20px hsl(var(--gold)/0.4)",
                      }}
                    >
                      <Mic className="w-4 h-4" />
                      Done Speaking
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowEndConfirm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-all duration-200 shadow-[0_4px_20px_hsl(var(--destructive)/0.3)] hover:shadow-[0_6px_28px_hsl(var(--destructive)/0.45)] hover:-translate-y-0.5"
                    >
                      <PhoneOff className="w-4 h-4" />
                      End Interview
                    </button>
                  )}

                  {/* Speaker mute */}
                  <button
                    onClick={() => setSpeakerMuted((m) => !m)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 ${
                      speakerMuted
                        ? "bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                    title={speakerMuted ? "Unmute speaker" : "Mute speaker"}
                  >
                    {speakerMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Session info */}
                <div className="rounded-2xl border border-border bg-card px-5 py-4 space-y-3">
                  <h4 className="font-mono text-[10px] tracking-widest uppercase text-primary">
                    Session Info
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: "Application", value: `#${id}` },
                      {
                        label: "Questions",
                        value: `${transcript.filter((t) => t.speaker === "AI").length} asked`,
                      },
                      {
                        label: "Answers",
                        value: `${transcript.filter((t) => t.speaker === "User").length} given`,
                      },
                      { label: "Duration", value: formatTime(elapsed) },
                    ].map(({ label, value }) => (
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

      {/* End confirm modal */}
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
              Your session will be saved and a detailed feedback report will be
              generated.
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
                onClick={endSession}
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
