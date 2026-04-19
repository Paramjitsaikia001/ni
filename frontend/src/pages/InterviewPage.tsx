/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSarvamSTT } from "../hooks/useSarvamSTT";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  AlertCircle,
  Captions,
  CaptionsOff,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { io, Socket } from "socket.io-client";
import { API_BASE } from "../lib/api";
import type { SessionPhase, TranscriptLine, Speaker } from "../utils/types";
import AIOrb from "../components/interviewPage/aiWindow";
import UserVideo from "../components/interviewPage/userWindow";
import TranscriptEntry from "../components/interviewPage/TranscriptEntry";

// socket endpoint can be overridden via env, otherwise default to backend host
const SOCKET_ENDPOINT =
  import.meta.env.VITE_BACKEND_SOCKET ?? "http://localhost:30000";
const MANUAL_SUBMIT_MODE = true;

// debug connection target
console.debug("InterviewPage socket endpoint:", SOCKET_ENDPOINT);

//Formating time in mm:ss
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

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-IN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Phase labels
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



export default function Interview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // id initially holds applicationId; we convert to interviewId after calling backend
  const [interviewId, setInterviewId] = useState(null);
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
  const [isCaption, setIsCaption] = useState(false);

  /* session */
  const [phase, setPhase] = useState<SessionPhase>("connecting");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [liveAnswer, setLiveAnswer] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sttStatus, setSttStatus] = useState<
    "connected" | "connecting" | "offline"
  >("connecting");
  const [voiceTrackEvents, setVoiceTrackEvents] = useState<
    { at: string; event: string; detail?: string }[]
  >([]);
  const [partialCount, setPartialCount] = useState(0);
  const [finalCount, setFinalCount] = useState(0);
  const [lastTranscriptPreview, setLastTranscriptPreview] = useState("");
  const [micLevel, setMicLevel] = useState(0);

  /* refs */
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef(Date.now());
  const recognitionRef = useRef<any>(null);
  const speakerMutedRef = useRef(false);
  const finalAnswerRef = useRef(""); // final STT transcript
  const finalAudioRef = useRef<{
    audioBase64: string;
    mimeType: string;
  } | null>(null);
  const lastCommittedUserTextRef = useRef("");
  const socketRef = useRef<Socket | null>(null);
  const isSubmittingRef = useRef(false); // to prevent multiple submits
  const isRecordingRef = useRef(false);
  const autoSubmitPendingRef = useRef(false);

  const {
    isListening: isSarvamListening,
    start: startSarvam,
    stop: stopSarvam,
  } = useSarvamSTT(socketRef.current, interviewId, stream, {
    silenceDurationMs: MANUAL_SUBMIT_MODE ? 120000 : 7000,
    isMicMuted: isMuted,
    minRecordingMs: MANUAL_SUBMIT_MODE ? 6000 : 4000,
    minSpeechMs: MANUAL_SUBMIT_MODE ? 1500 : 1200,
    minAudioBytes: 2500,
    noSpeechTimeoutMs: MANUAL_SUBMIT_MODE ? 120000 : 14000,
    maxRecordingMs: MANUAL_SUBMIT_MODE ? 120000 : 30000,
    onFinalAudio: (audioBase64: string, mimeType: string) => {
      finalAudioRef.current = { audioBase64, mimeType };
      trackVoiceEvent(
        "final_audio_captured",
        `bytes≈${Math.floor(audioBase64.length * 0.75)}`,
      );
    },
    onMicNoSignal: () => {
      setError(
        "Microphone signal not detected. Check browser mic input device and OS mic permissions.",
      );
      trackVoiceEvent("mic_no_signal");
    },
    onAudioLevel: (rms: number) => {
      setMicLevel(rms);
    },
    onSilenceDetected: () => {
      if (isSubmittingRef.current || !isRecordingRef.current) return;
      autoSubmitPendingRef.current = true;
      isRecordingRef.current = false;
    },
  });

  const [error, setError] = useState<string | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const endSessionRef = useRef<() => void>(() => {});
  const submitAnswerRef = useRef<
    (answerOverride?: string, options?: { skipStop?: boolean }) => void
  >(() => {});

  const trackVoiceEvent = useCallback((event: string, detail?: string) => {
    setVoiceTrackEvents((prev) => {
      const next = [{ at: nowLabel(), event, detail }, ...prev];
      return next.slice(0, 10);
    });
  }, []);

  /* keep refs in sync */
  useEffect(() => {
    speakerMutedRef.current = speakerMuted;
  }, [speakerMuted]);

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
      stopSarvam({ emitFinal: false });
    };
  }, [stream, stopSarvam]);

  const addLine = useCallback((speaker: Speaker, text: string) => {
    setTranscript((prev) => [
      ...prev,
      { speaker, text, time: elapsedLabel(sessionStartRef.current) },
    ]);
  }, []);

  // SPEAK — Callback for AI text/audio
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

  //  START USER RECORDING (STT)
  const startListening = useCallback(() => {
    setIsMuted(false);
    setPhase("user-recording");
    setLiveAnswer("");
    finalAnswerRef.current = "";
    finalAudioRef.current = null;
    autoSubmitPendingRef.current = false;
    isRecordingRef.current = true;
    trackVoiceEvent("recording_started");
    startSarvam();
  }, [startSarvam, trackVoiceEvent]);

  //  SUBMIT user's answer
  const submitAnswer = useCallback(
    async (answerOverride?: string, options?: { skipStop?: boolean }) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      isRecordingRef.current = false;
      trackVoiceEvent("recording_stopped");
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (!options?.skipStop) {
        stopSarvam({ emitFinal: true });
        await new Promise((r) => setTimeout(r, 300));
      }

      const answer = (
        answerOverride ||
        finalAnswerRef.current ||
        liveAnswer
      ).trim();
      const hasFinalAudio = !!finalAudioRef.current?.audioBase64;
      const finalAudioBytes = finalAudioRef.current?.audioBase64
        ? Math.floor(finalAudioRef.current.audioBase64.length * 0.75)
        : 0;

      if (hasFinalAudio && finalAudioBytes < 2500) {
        setError(
          "Captured audio is too short/quiet. Please speak a bit longer and try again.",
        );
        trackVoiceEvent(
          "submit_blocked_small_audio",
          `bytes=${finalAudioBytes}`,
        );
        autoSubmitPendingRef.current = false;
        isSubmittingRef.current = false;
        setPhase("user-recording");
        startSarvam();
        return;
      }

      if (!answer && !hasFinalAudio) {
        setError("No transcript available to submit.");
        trackVoiceEvent("submit_skipped", "no transcript available");
        autoSubmitPendingRef.current = false;
        isSubmittingRef.current = false;
        return;
      }

      setLiveAnswer("");
      autoSubmitPendingRef.current = false;
      if (answer) {
        addLine("User", answer);
        lastCommittedUserTextRef.current = answer;
      }
      setPhase("processing");

      try {
        trackVoiceEvent("answer_submitted", `chars=${answer.length}`);
        socketRef.current?.emit("send_answer", {
          interviewId: interviewId ?? id,
          answer: answer || undefined,
          audioBase64: finalAudioRef.current?.audioBase64,
          mimeType: finalAudioRef.current?.mimeType,
        });
        finalAudioRef.current = null;
      } catch {
        setError("Failed to submit answer. Please check your connection.");
        trackVoiceEvent("submit_error");
        setPhase("user-recording");
        isSubmittingRef.current = false;
      }
    },
    [
      id,
      interviewId,
      liveAnswer,
      addLine,
      stopSarvam,
      trackVoiceEvent,
      startSarvam,
    ],
  );

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  //start session
  const startSession = useCallback(async () => {
    setPhase("connecting");
    // nothing else; joining is handled in separate effect when interviewId arrives
  }, []);

  /* ── auto-submit on silence ── */
  // useEffect(() => {
  //   if (phase !== "user-recording") return;

  //   // Auto-submit after 4 seconds of silence, but only if they've explicitly started talking
  //   if (liveAnswer.trim().length > 0) {
  //     const timeout = setTimeout(() => {
  //       submitAnswer();
  //     }, 4000);
  //     return () => clearTimeout(timeout);
  //   }
  // }, [liveAnswer, phase, submitAnswer]);

  //end session and navigate to jobs page
  const endSession = useCallback(() => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    // Session termination should not trigger an extra STT turn.
    stopSarvam({ emitFinal: false });
    stream?.getTracks().forEach((t) => t.stop());
    setPhase("ended");
    navigate(`/jobs`);
  }, [stream, navigate, stopSarvam]);

  // Keep refs up to date
  startListeningRef.current = startListening;
  endSessionRef.current = endSession;

  /* ── socket creation & handlers (runs once) ── */
  useEffect(() => {
    const socket = io(SOCKET_ENDPOINT, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Interview Socket Connected:", socket.id);
      trackVoiceEvent("socket_connected");
    });

    socket.on(
      "ai_question",
      (payload: { question: string; audio?: string; isEnd?: boolean }) => {
        if (!payload?.question) return;
        addLine("AI", payload.question);
        trackVoiceEvent("ai_question_received");
        setPhase("ai-speaking");
        isSubmittingRef.current = false;
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
      },
    );

    socket.on(
      "ai_feedback",
      (payload: { feedback: string; audio?: string }) => {
        if (!payload?.feedback) return;

        addLine("AI", payload.feedback);
        setPhase("ai-speaking");

        if (payload.audio) {
          playAudioBase64(payload.audio, () => {});
        } else {
          speak(payload.feedback, () => {});
        }
      },
    );

    socket.on("ai_audio", (payload: { audio: string }) => {
      if (!payload?.audio) return;

      playAudioBase64(payload.audio, () => {});
    });

    socket.on("partial_transcript", (data: { text: string }) => {
      if (!data?.text) return;
      setLiveAnswer(data.text);
      finalAnswerRef.current = data.text;
      setPartialCount((c) => c + 1);
      setLastTranscriptPreview(data.text);
      trackVoiceEvent("partial_transcript", data.text.slice(0, 80));
    });

    socket.on("final_transcript", (text: string) => {
      if (text) {
        setLiveAnswer(text);
        finalAnswerRef.current = text;
        setFinalCount((c) => c + 1);
        setLastTranscriptPreview(text);
        trackVoiceEvent("final_transcript", text.slice(0, 80));
      } else {
        trackVoiceEvent("final_transcript_empty");
      }
      if (autoSubmitPendingRef.current) {
        autoSubmitPendingRef.current = false;
        submitAnswerRef.current(text || undefined, { skipStop: true });
      }
    });

    socket.on("stt_transcript", (text: string) => {
      if (text) {
        setLiveAnswer(text);
        finalAnswerRef.current = text;
        setFinalCount((c) => c + 1);
        setLastTranscriptPreview(text);
        trackVoiceEvent("stt_transcript", text.slice(0, 80));
      } else {
        trackVoiceEvent("stt_transcript_empty");
      }
      if (autoSubmitPendingRef.current) {
        autoSubmitPendingRef.current = false;
        submitAnswerRef.current(text || undefined, { skipStop: true });
      }
    });

    socket.on("speech_end", () => {
      if (isSubmittingRef.current) return;
      trackVoiceEvent("speech_end_received");
      submitAnswerRef.current();
    });

    socket.on("stt_error", () => {
      trackVoiceEvent("stt_error");
      autoSubmitPendingRef.current = false;
      isSubmittingRef.current = false;
      isRecordingRef.current = false;
    });

    socket.on("user_transcript", (payload: { text: string }) => {
      const text = (payload?.text || "").trim();
      if (!text) return;
      setLiveAnswer(text);
      finalAnswerRef.current = text;
      if (text !== lastCommittedUserTextRef.current) {
        addLine("User", text);
        lastCommittedUserTextRef.current = text;
      }
    });

    socket.on("interview_end", () => {
      setTimeout(() => {
        endSessionRef.current();
      }, 15000);
    });

    socket.on(
      "stt_status",
      (status: "connected" | "connecting" | "offline") => {
        setSttStatus(status);
        trackVoiceEvent("stt_status", status);
      },
    );

    socket.on("disconnect", () => {
      console.log("Interview socket disconnected");
      setSttStatus("offline");
      trackVoiceEvent("socket_disconnected");
    });

    return () => {
      socket.off("ai_question");
      socket.off("ai_feedback");
      socket.off("partial_transcript");
      socket.off("final_transcript");
      socket.off("stt_transcript");
      socket.off("speech_end");
      socket.off("stt_error");
      socket.off("user_transcript");
      socket.off("interview_end");
      socket.off("stt_status");
      socket.off("disconnect");
      socket.disconnect();
    };
    // handlers use stable refs for addLine etc; if those ever change you may need to update
  }, [addLine, speak, playAudioBase64, trackVoiceEvent]);

  useEffect(() => {
    if (isSarvamListening) {
      trackVoiceEvent("frontend_listening");
    }
  }, [isSarvamListening, trackVoiceEvent]);

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

      <div className="h-screen bg-background flex flex-col">
        {/* <Navbar isLoggedIn={true} /> */}

        <main className="min-w-full h-screen  pt-6 pb-6 ">
          <div className="  h-full  max-w-7xl mx-auto flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="apex-tag">Live Session</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Recording
                </span>

{/* application badge  */}

                {/* <Badge
                  variant="outline"
                  className="text-[10px] border-primary/30 text-primary"
                >
                  Application #{id}
                </Badge> */}
              </div>
            </div>

            {/* Main grid */}
            <div
              className={`grid grid-cols-1  ${isCaption ? "lg:grid-cols-3" : " lg:grid-cols-2"} w-full h-[70vh] gap-5 `}
            >
              {/*  AI Panel ── */}
              <div className="flex flex-col w-full  h-full gap-4 transition-transform duration-500">
                {/* AI orb */}
                <div
                  className="rounded-2xl h-full w-full  border border-border bg-card p-6 flex flex-col justify-center items-center gap-6"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 100%)",
                  }}
                >
                  <AIOrb phase={phase} />
                  <div className="flex flex-col items-center text-center max-w-[400px]">
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
                          ? MANUAL_SUBMIT_MODE
                            ? "Speak your answer, then click Done Speaking."
                            : "Speak your answer clearly. We auto-submit after silence."
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
              </div>

              {/* User Panel ── */}
              <div className="flex flex-col h-full gap-4 transition-transform duration-500">
                <UserVideo
                  stream={stream}
                  isMuted={isMuted}
                  cameraError={cameraError}
                  phase={phase}
                  isSarvamListening={isSarvamListening}
                  sttStatus={sttStatus}
                />

                <div className="rounded-2xl hidden border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono tracking-widest uppercase text-primary">
                      Voice Tracker
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      {phaseLabel(phase)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                    <div className="rounded-md bg-secondary/50 px-2 py-1.5">
                      Recording:{" "}
                      <span className="font-semibold">
                        {phase === "user-recording" ? "yes" : "no"}
                      </span>
                    </div>
                    <div className="rounded-md bg-secondary/50 px-2 py-1.5">
                      Listening:{" "}
                      <span className="font-semibold">
                        {isSarvamListening ? "yes" : "no"}
                      </span>
                    </div>
                    <div className="rounded-md bg-secondary/50 px-2 py-1.5">
                      Partial:{" "}
                      <span className="font-semibold">{partialCount}</span>
                    </div>
                    <div className="rounded-md bg-secondary/50 px-2 py-1.5">
                      Final: <span className="font-semibold">{finalCount}</span>
                    </div>
                    <div className="rounded-md bg-secondary/50 px-2 py-1.5 col-span-2">
                      Mic RMS:{" "}
                      <span className="font-semibold">
                        {micLevel.toFixed(6)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                    Last transcript: {lastTranscriptPreview || "N/A"}
                  </p>
                  <div className="space-y-1 max-h-28 overflow-auto pr-1">
                    {voiceTrackEvents.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        Waiting for voice events...
                      </p>
                    ) : (
                      voiceTrackEvents.map((item, idx) => (
                        <div
                          key={`${item.at}-${item.event}-${idx}`}
                          className="text-[11px] text-muted-foreground"
                        >
                          [{item.at}] {item.event}
                          {item.detail ? `: ${item.detail}` : ""}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div
                className={`flex-1 ${isCaption ? "bg-muted" : "hidden"} min-h-0 rounded-2xl border border-border bg-card flex flex-col overflow-hidden transition-transform duration-500`}
              >
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest uppercase text-primary">
                      Transcript
                    </span>
                  </div>
                </div>

                <div
                  ref={transcriptRef}
                  className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border"
                >
                  {transcript.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        
                    </div>
                  ) : (
                    transcript.map((entry, i) => (
                      <div key={i} className="transcript-entry">
                        <TranscriptEntry
                          {...entry}
                          isLatest={i === transcript.length - 1 && !liveAnswer}
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
          </div>
        </main>
        {/* Controls */}
        <div
          className="rounded-2xl border border-border bg-card p-4 flex items-center justify-center gap-3"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--gold)/0.02) 100%)",
          }}
        >
          {/* transctiption show  */}
          <button
            onClick={() => setIsCaption((m) => !m)}
            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              isMuted
                ? "bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
            title={isCaption ? "Unmute microphone" : "Mute microphone"}
          >
            {isCaption ? (
              <CaptionsOff className="w-4 h-4" />
            ) : (
              <Captions className="w-4 h-4" />
            )}
          </button>

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
          {isRecording && (
            <button
              onClick={() => submitAnswerRef.current()}
              disabled={isSubmittingRef.current}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Done Speaking
            </button>
          )}

          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-all duration-200 shadow-[0_4px_20px_hsl(var(--destructive)/0.3)] hover:shadow-[0_6px_28px_hsl(var(--destructive)/0.45)] hover:-translate-y-0.5"
          >
            <PhoneOff className="w-4 h-4" />
            End Interview
          </button>

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

      </div>
      {/* End confirm modal */}
      {showEndConfirm && (
        <div className="fixed inset-0  z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
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
