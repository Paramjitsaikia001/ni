import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

type STTState = {
  isListening: boolean;
  error?: string;
};

type STTOptions = {
  silenceDurationMs?: number;
  onSilenceDetected?: () => void;
  isMicMuted?: boolean;
  minRecordingMs?: number;
  minSpeechMs?: number;
  minAudioBytes?: number;
  noSpeechTimeoutMs?: number;
  maxRecordingMs?: number;
  onFinalAudio?: (audioBase64: string, mimeType: string) => void;
  onMicNoSignal?: () => void;
  onAudioLevel?: (rms: number, isVoice: boolean) => void;
};

export function useSarvamSTT(
  socket: Socket | null,
  interviewId: string | null,
  inputStream?: MediaStream | null,
  options?: STTOptions,
) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");
  const silenceDurationMsRef = useRef(options?.silenceDurationMs ?? 5000);
  const onSilenceDetectedRef = useRef<(() => void) | undefined>(
    options?.onSilenceDetected,
  );
  const onFinalAudioRef = useRef<((audioBase64: string, mimeType: string) => void) | undefined>(
    options?.onFinalAudio,
  );
  const onMicNoSignalRef = useRef<(() => void) | undefined>(options?.onMicNoSignal);
  const onAudioLevelRef = useRef<((rms: number, isVoice: boolean) => void) | undefined>(
    options?.onAudioLevel,
  );
  const isMicMutedRef = useRef(!!options?.isMicMuted);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const autoStoppedRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const firstVoiceAtRef = useRef(0);
  const totalRecordedBytesRef = useRef(0);
  const shouldEmitFinalRef = useRef(true);
  const minRecordingMsRef = useRef(options?.minRecordingMs ?? 2500);
  const minSpeechMsRef = useRef(options?.minSpeechMs ?? 700);
  const minAudioBytesRef = useRef(options?.minAudioBytes ?? 12000);
  const noSpeechTimeoutMsRef = useRef(options?.noSpeechTimeoutMs ?? 10000);
  const maxRecordingMsRef = useRef(options?.maxRecordingMs ?? 20000);
  const [state, setState] = useState<STTState>({
    isListening: false,
  });

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  useEffect(() => {
    silenceDurationMsRef.current = options?.silenceDurationMs ?? 5000;
    onSilenceDetectedRef.current = options?.onSilenceDetected;
    onFinalAudioRef.current = options?.onFinalAudio;
    onMicNoSignalRef.current = options?.onMicNoSignal;
    onAudioLevelRef.current = options?.onAudioLevel;
    isMicMutedRef.current = !!options?.isMicMuted;
    minRecordingMsRef.current = options?.minRecordingMs ?? 2500;
    minSpeechMsRef.current = options?.minSpeechMs ?? 700;
    minAudioBytesRef.current = options?.minAudioBytes ?? 12000;
    noSpeechTimeoutMsRef.current = options?.noSpeechTimeoutMs ?? 10000;
    maxRecordingMsRef.current = options?.maxRecordingMs ?? 20000;
  }, [options?.silenceDurationMs, options?.onSilenceDetected, options?.onFinalAudio, options?.onMicNoSignal, options?.onAudioLevel, options?.isMicMuted, options?.minRecordingMs, options?.minSpeechMs, options?.minAudioBytes, options?.noSpeechTimeoutMs, options?.maxRecordingMs]);

  const stopAudioMonitoring = useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      // no-op
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      // no-op
    }
    sourceRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // no-op
      }
      audioContextRef.current = null;
    }
  }, []);

  const startAudioMonitoring = useCallback(async (stream: MediaStream) => {
    hasSpokenRef.current = false;
    autoStoppedRef.current = false;
    lastVoiceAtRef.current = Date.now();
    recordingStartedAtRef.current = Date.now();
    firstVoiceAtRef.current = 0;
    totalRecordedBytesRef.current = 0;
    let maxRms = 0;
    let noSignalRaised = false;

    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch {
        // no-op
      }
    }
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    sourceRef.current = source;
    analyserRef.current = analyser;

    const sample = new Uint8Array(analyser.fftSize);
    let noiseFloor = 0.006;
    const absoluteMinVoiceThreshold = 0.008;

    const tick = () => {
      const media = mediaRef.current;
      if (!media || media.state !== "recording") {
        return;
      }
      if (audioContext.state === "suspended") {
        void audioContext.resume().catch(() => {});
      }

      analyser.getByteTimeDomainData(sample);
      let sum = 0;
      for (let i = 0; i < sample.length; i += 1) {
        const n = (sample[i] - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / sample.length);
      const now = Date.now();
      const micMuted = isMicMutedRef.current;
      const elapsed = now - recordingStartedAtRef.current;
      const enoughAudioBytes = totalRecordedBytesRef.current >= minAudioBytesRef.current;

      if (!micMuted && rms < noiseFloor * 1.5) {
        // Learn ambient noise floor gradually to stay stable in noisy rooms.
        noiseFloor = noiseFloor * 0.95 + rms * 0.05;
      }

      const dynamicVoiceThreshold = Math.max(
        absoluteMinVoiceThreshold,
        noiseFloor * 1.6,
      );
      const isVoice = !micMuted && rms > dynamicVoiceThreshold;
      if (rms > maxRms) maxRms = rms;
      onAudioLevelRef.current?.(rms, isVoice);

      if (isVoice) {
        hasSpokenRef.current = true;
        if (firstVoiceAtRef.current === 0) {
          firstVoiceAtRef.current = now;
        }
        lastVoiceAtRef.current = now;
      } else if (
        (hasSpokenRef.current || micMuted) &&
        !autoStoppedRef.current &&
        now - recordingStartedAtRef.current >= minRecordingMsRef.current &&
        (!hasSpokenRef.current || now - firstVoiceAtRef.current >= minSpeechMsRef.current) &&
        enoughAudioBytes &&
        now - lastVoiceAtRef.current >= silenceDurationMsRef.current
      ) {
        autoStoppedRef.current = true;
        onSilenceDetectedRef.current?.();
        media.requestData();
        media.stop();
        return;
      }

      // Fallback if VAD misses voice activity.
      if (!autoStoppedRef.current && !hasSpokenRef.current && elapsed >= noSpeechTimeoutMsRef.current) {
        if (!noSignalRaised && maxRms < 0.005) {
          noSignalRaised = true;
          onMicNoSignalRef.current?.();
        }
        autoStoppedRef.current = true;
        onSilenceDetectedRef.current?.();
        media.requestData();
        media.stop();
        return;
      }

      // Hard cap to prevent getting stuck in recording forever.
      if (!autoStoppedRef.current && elapsed >= maxRecordingMsRef.current) {
        autoStoppedRef.current = true;
        onSilenceDetectedRef.current?.();
        media.requestData();
        media.stop();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    if (!socket || !interviewId) {
      setState({ isListening: false, error: "Socket or interviewId unavailable" });
      return;
    }
    if (mediaRef.current?.state === "recording") {
      // Avoid overlapping recorders between turns.
      return;
    }

    try {
      shouldEmitFinalRef.current = true;
      let stream: MediaStream;
      let ownsStreamTracks = true;
      if (inputStream && inputStream.getAudioTracks().length > 0) {
        // Use a dedicated capture stream from the same input device as interview media.
        // This avoids silent recordings caused by shared-track enable/disable side effects.
        const sourceTrack = inputStream.getAudioTracks()[0];
        const deviceId = sourceTrack.getSettings().deviceId;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        ownsStreamTracks = true;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      }

      const supportedWebmOpus = MediaRecorder.isTypeSupported("audio/webm;codecs=opus");
      const supportedWebm = MediaRecorder.isTypeSupported("audio/webm");

      if (!supportedWebm && !supportedWebmOpus) {
        throw new Error("Browser does not support audio/webm MediaRecorder");
      }

      const mimeType = supportedWebmOpus ? "audio/webm;codecs=opus" : "audio/webm";
      mimeTypeRef.current = mimeType;
      chunksRef.current = [];

      const media = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      const activeTrack = stream.getAudioTracks()[0];
      console.debug("STT capture track", {
        enabled: activeTrack?.enabled,
        muted: (activeTrack as MediaStreamTrack | undefined)?.muted,
        readyState: activeTrack?.readyState,
        settings: activeTrack?.getSettings?.(),
      });
      mediaRef.current = media;

      media.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          totalRecordedBytesRef.current += event.data.size;
          // Secondary signal: chunk size growth often indicates non-silent speech audio.
          if (event.data.size >= 800) {
            hasSpokenRef.current = true;
            if (firstVoiceAtRef.current === 0) {
              firstVoiceAtRef.current = Date.now();
            }
            lastVoiceAtRef.current = Date.now();
          }
          chunksRef.current.push(event.data);
          const buffer = await event.data.arrayBuffer();
          const base64 = arrayBufferToBase64(buffer);

          socket.emit("audio_chunk", {
            interviewId,
            audio: base64,
            mimeType,
          });
        }
      };

      media.onstop = async () => {
        try {
          if (shouldEmitFinalRef.current && socket && interviewId) {
            const finalBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
            if (finalBlob.size > 0) {
              const finalBuffer = await finalBlob.arrayBuffer();
              const finalBase64 = arrayBufferToBase64(finalBuffer);
              onFinalAudioRef.current?.(finalBase64, mimeTypeRef.current);
              socket.emit("final_answer", {
                interviewId,
                audioBase64: finalBase64,
                mimeType: mimeTypeRef.current,
              });
            } else {
              socket.emit("final_answer", { interviewId, mimeType: mimeTypeRef.current });
            }
          } else {
            console.warn("Skipping final_answer emit (disabled, or socket/interviewId unavailable).");
          }
        } finally {
          chunksRef.current = [];
          totalRecordedBytesRef.current = 0;
          setState((s) => ({ ...s, isListening: false }));
          await stopAudioMonitoring();
          if (ownsStreamTracks) {
            stream.getTracks().forEach((track) => track.stop());
          }
        }
      };

      media.start(250);
      await startAudioMonitoring(stream);
      setState({ isListening: true, error: undefined });
    } catch (err) {
      console.error("Failed to start Sarvam audio recording", err);
      setState({ isListening: false, error: "Microphone permission denied or unsupported" });
    }
  }, [socket, interviewId, inputStream, startAudioMonitoring, stopAudioMonitoring]);

  const stop = useCallback((params?: { emitFinal?: boolean }) => {
    shouldEmitFinalRef.current = params?.emitFinal ?? true;
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.requestData();
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    setState((s) => ({ ...s, isListening: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRef.current?.state === "recording") {
        mediaRef.current.requestData();
        mediaRef.current.stop();
      }
      mediaRef.current = null;
      chunksRef.current = [];
      void stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  return {
    ...state,
    start,
    stop,
  };
}
