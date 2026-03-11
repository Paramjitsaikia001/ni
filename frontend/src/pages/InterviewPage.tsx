import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

export default function InterviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [feedback, setFeedback] = useState("");
  const [nextQuestion, setNextQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const playAudio = (url: string) => {
    const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const audio = new Audio(`${base}${url}`);
    audio.play();
  };
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!interviewId) return;
  
    const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  
    socketRef.current = io(base);
    console.log("Connecting to interview socket:", interviewId);
  
    socketRef.current.emit("join_interview", interviewId);
    console.log("Joining interview room:", interviewId);
  
    socketRef.current.on("ai_thinking", () => {
      console.log("AI is thinking...");
      setIsThinking(true);
    });
  
    socketRef.current.on("ai_response", (data: { feedback: string; nextQuestion: string; feedbackAudioPath: string; nextQuestionAudioPath?: string }) => {
      console.log("AI response received:", data);
      setIsThinking(false);
  
      setFeedback(data.feedback);
      setNextQuestion(data.nextQuestion);
  
      playAudio(data.feedbackAudioPath);
  
      if (data.nextQuestionAudioPath) {
        playAudio(data.nextQuestionAudioPath);
      }
    });
  
    socketRef.current.on("ai_error", (err: { message?: string }) => {
      console.error("AI socket error:", err);
    });
  
    return () => {
      socketRef.current?.disconnect();
    };
  
  }, [interviewId]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });

      const arrayBuffer = await blob.arrayBuffer();

      console.log("Sending audio answer to backend...");
      socketRef.current?.emit("send_answer", {
        interviewId,
        audioBuffer: arrayBuffer
      });
    };

    mediaRecorder.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>AI Interview</h1>

      {isThinking && <p>AI is thinking...</p>}

      {nextQuestion && (
        <div>
          <h3>Next Question</h3>
          <p>{nextQuestion}</p>
        </div>
      )}

      {feedback && (
        <div>
          <h3>Feedback</h3>
          <p>{feedback}</p>
        </div>
      )}

      <button onClick={startRecording}>
        Start Answer
      </button>

      <button onClick={stopRecording}>
        Stop Answer
      </button>
    </div>
  );
}