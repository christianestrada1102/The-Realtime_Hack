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

  // Call this during a direct user gesture (tap) to pre-warm the AudioContext.
  // Chrome Android requires the AudioContext to be created/resumed from a user gesture;
  // creating it later (in an async callback) leaves it suspended and the analyser reads zeros.
  function warmAudioContext() {
    try {
      if (contextRef.current && contextRef.current.state !== "closed") {
        contextRef.current.resume().catch(() => {});
        return;
      }
      const ctx = new AudioContext();
      ctx.resume().catch(() => {});
      contextRef.current = ctx;
    } catch {}
  }

  function stop() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    // Don't close the context — keep it warm for the next startDetecting call
    if (contextRef.current) {
      contextRef.current.suspend().catch(() => {});
    }
  }

  function startDetecting(
    stream: MediaStream,
    onSilence: () => void,
    onCancel: () => void,
    onVolume?: (bars: number[]) => void,
    silenceThreshold = 15
  ) {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    // Reuse pre-warmed context if available, otherwise create fresh
    let ctx = contextRef.current;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioContext();
      contextRef.current = ctx;
    }
    ctx.resume().catch(() => {});

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    silenceSinceRef.current = null;
    everSpokeRef.current = false;
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (onVolume) {
        const chunkSize = Math.floor(dataArray.length / NUM_BARS);
        const bars = Array.from({ length: NUM_BARS }, (_, i) => {
          const slice = dataArray.slice(i * chunkSize, (i + 1) * chunkSize);
          const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
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

  function stopDetecting() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (contextRef.current && contextRef.current.state !== "closed") {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
  }

  return { startDetecting, stopDetecting, warmAudioContext };
}
