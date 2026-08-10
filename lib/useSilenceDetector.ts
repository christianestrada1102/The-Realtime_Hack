"use client";

import { useRef } from "react";

const SILENCE_DURATION_MS = 1500;
const NO_SPEECH_TIMEOUT_MS = 5000;
const NUM_BARS = 5;

export function useSilenceDetector() {
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const everSpokeRef = useRef(false);

  function stop() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (contextRef.current) { contextRef.current.close(); contextRef.current = null; }
  }

  function startDetecting(
    stream: MediaStream,
    onSilence: () => void,
    onCancel: () => void,
    onVolume?: (bars: number[]) => void,
    silenceThreshold = 15
  ) {
    stop();

    const ctx = new AudioContext();
    contextRef.current = ctx;
    ctx.resume().catch(() => {});

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount); // 128 bins
    silenceSinceRef.current = null;
    everSpokeRef.current = false;
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      // Compute bar heights for waveform (5 bars from frequency data)
      if (onVolume) {
        const chunkSize = Math.floor(dataArray.length / NUM_BARS);
        const bars = Array.from({ length: NUM_BARS }, (_, i) => {
          const slice = dataArray.slice(i * chunkSize, (i + 1) * chunkSize);
          const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
          // Scale 0–255 → 4–40px
          return Math.max(4, Math.round((mean / 255) * 40));
        });
        onVolume(bars);
      }

      if (avg >= silenceThreshold) {
        everSpokeRef.current = true;
        silenceSinceRef.current = null;
        return;
      }

      if (!everSpokeRef.current) {
        if (Date.now() - startTime > NO_SPEECH_TIMEOUT_MS) { stop(); onCancel(); }
        return;
      }

      if (silenceSinceRef.current === null) { silenceSinceRef.current = Date.now(); return; }

      if (Date.now() - silenceSinceRef.current >= SILENCE_DURATION_MS) { stop(); onSilence(); }
    }, 100);
  }

  return { startDetecting, stopDetecting: stop };
}
