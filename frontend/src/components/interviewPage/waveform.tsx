import  { useState, useEffect } from "react";

function Waveform({ active, color = "hsl(var(--primary)/0.7)", stream = null}: {active: boolean; color?: string; stream?: MediaStream | null;
}) {
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!active || !stream || stream.getAudioTracks().length === 0) {
      return;
    }

    const AudioContext =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.AudioContext || (window as any).webkitAudioContext;
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

        const randomFactor =
          0.45 + 0.35 * (Math.sin((i + 1) * 0.75) * 0.5 + 0.5);
        const baseHeight = active && !stream ? 8 + randomFactor * 22 : 4;
        const reactiveHeight =
          stream && active ? 4 + volume * (10 + randomFactor * 20) : baseHeight;

        return (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: "3px",
              background: color,
              height: `${reactiveHeight}px`,
              transition: stream ? "height 0.05s ease" : "height 0.15s ease",
              animation:
                active && !stream
                  ? `waveBar 0.5s ease-in-out ${(i % 7) * 0.07}s infinite alternate`
                  : "none",
            }}
          />
        );
      })}
    </div>
  );
}

export default Waveform;
