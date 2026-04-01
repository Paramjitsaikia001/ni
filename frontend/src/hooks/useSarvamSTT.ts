import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

type STTState = {
  isListening: boolean;
  error?: string;
};

export function useSarvamSTT(socket: Socket | null, interviewId: string | null) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const [state, setState] = useState<STTState>({
    isListening: false,
  });

  const start = useCallback(async () => {
    if (!socket || !interviewId) {
      setState({ isListening: false, error: "Socket or interviewId unavailable" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const supportedWebm = MediaRecorder.isTypeSupported("audio/webm");
      const supportedWebmOpus = MediaRecorder.isTypeSupported("audio/webm;codecs=opus");

      if (!supportedWebm && !supportedWebmOpus) {
        throw new Error("Browser does not support audio/webm MediaRecorder");
      }

      const mimeType = supportedWebm ? "audio/webm" : "audio/webm;codecs=opus";

      const media = new MediaRecorder(stream, { mimeType });
      mediaRef.current = media;

      media.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const buffer = await event.data.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(buffer))
          );

          socket.emit("audio_chunk", {
            interviewId,
            audio: base64,
            mimeType,
          });
        }
      };

      media.start(250);
      setState({ isListening: true, error: undefined });
    } catch (err) {
      console.error("Failed to start Sarvam audio recording", err);
      setState({ isListening: false, error: "Microphone permission denied or unsupported" });
    }
  }, [socket, interviewId]);

  const stop = useCallback(() => {
    if (socket && interviewId) {
      socket.emit("final_answer", { interviewId });
    }

    mediaRef.current?.stop();
    mediaRef.current = null;
    setState((s) => ({ ...s, isListening: false }));
  }, [socket, interviewId]);

  useEffect(() => {
    return () => {
      mediaRef.current?.stop();
      mediaRef.current = null;
    };
  }, []);

  return {
    ...state,
    start,
    stop,
  };
}
