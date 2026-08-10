"use client";

import { useRef } from "react";

const SILENCE_DURATION_MS = 1500;
const GRACE_PERIOD_MS = 1500; // let mic settle before detecting silence
const STUCK_TIMEOUT_MS = 12000; // failsafe: if always noisy, force onSilence anyway
const NUM_BARS = 5;

export function useSilenceDetector() {
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceSinceRef = useRef<number | null>(null);

  // Call from a direct user gesture (tap) to pre-warm the AudioContext.
  // Chrome iOS / Chrome Android require the context to be created from a gesture.
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

  function stopInterval() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function startDetecting(
    stream: MediaStream,
    onSilence: () => void,
    _onCancel: () => void, // kept for API compat — grace period replaces cancel logic
    onVolume?: (bars: number[]) => void,
    silenceThreshold = 15
  ) {
    stopInterval();

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
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const elapsed = Date.now() - startTime;

      // Waveform bars
      if (onVolume) {
        const chunkSize = Math.floor(dataArray.length / NUM_BARS);
        const bars = Array.from({ length: NUM_BARS }, (_, i) => {
          const slice = dataArray.slice(i * chunkSize, (i + 1) * chunkSize);
          const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
          return Math.max(4, Math.round((mean / 255) * 40));
        });
        onVolume(bars);
      }

      // Grace period — don't act yet, mic is settling
      if (elapsed < GRACE_PERIOD_MS) return;

      // Failsafe — if stuck for too long (constant noise), force send
      if (elapsed > STUCK_TIMEOUT_MS) { stopInterval(); onSilence(); return; }

      if (avg >= silenceThreshold) {
        // User is speaking — reset silence timer
        silenceSinceRef.current = null;
        return;
      }

      // Below threshold — accumulate silence
      if (silenceSinceRef.current === null) { silenceSinceRef.current = Date.now(); return; }

      if (Date.now() - silenceSinceRef.current >= SILENCE_DURATION_MS) {
        stopInterval();
        onSilence();
      }
    }, 100);
  }

  function stopDetecting() {
    stopInterval();
    if (contextRef.current && contextRef.current.state !== "closed") {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
  }

  return { startDetecting, stopDetecting, warmAudioContext };
}
