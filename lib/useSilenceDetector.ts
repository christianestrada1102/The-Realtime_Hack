"use client";

import { useRef } from "react";

const SILENCE_DURATION_MS = 1500;
const GRACE_PERIOD_MS = 1500; // let mic settle before detecting silence
const STUCK_TIMEOUT_MS = 12000; // failsafe: if always noisy, force onSilence anyway
const CHROME_IOS_DURATION_MS = 8000; // Chrome iOS: fixed-duration fallback (analyser unreliable)
const NUM_BARS = 5;

export function useSilenceDetector() {
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceSinceRef = useRef<number | null>(null);

  // Call from a direct user gesture (tap) to pre-warm the AudioContext.
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

  function startFallbackTimer(onSilence: () => void, onVolume?: (bars: number[]) => void) {
    // Chrome iOS: AudioContext analyser is unreliable — use a fixed-duration timer instead.
    // Show fake animation so user knows we're listening; process after CHROME_IOS_DURATION_MS.
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      if (onVolume) {
        // Pulse bars gently so the UI shows activity
        const t = (Date.now() - startTime) / 400;
        const bars = Array.from({ length: NUM_BARS }, (_, i) =>
          Math.max(4, Math.round(8 + Math.sin(t + i * 0.8) * 6))
        );
        onVolume(bars);
      }
      if (Date.now() - startTime >= CHROME_IOS_DURATION_MS) {
        stopInterval();
        onSilence();
      }
    }, 100);
  }

  function startAnalyserInterval(
    analyser: AnalyserNode,
    onSilence: () => void,
    onVolume?: (bars: number[]) => void,
    silenceThreshold = 15
  ) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    silenceSinceRef.current = null;
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const elapsed = Date.now() - startTime;

      if (onVolume) {
        const chunkSize = Math.floor(dataArray.length / NUM_BARS);
        const bars = Array.from({ length: NUM_BARS }, (_, i) => {
          const slice = dataArray.slice(i * chunkSize, (i + 1) * chunkSize);
          const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
          return Math.max(4, Math.round((mean / 255) * 40));
        });
        onVolume(bars);
      }

      if (elapsed < GRACE_PERIOD_MS) return;
      if (elapsed > STUCK_TIMEOUT_MS) { stopInterval(); onSilence(); return; }

      if (avg >= silenceThreshold) {
        silenceSinceRef.current = null;
        return;
      }

      if (silenceSinceRef.current === null) { silenceSinceRef.current = Date.now(); return; }
      if (Date.now() - silenceSinceRef.current >= SILENCE_DURATION_MS) {
        stopInterval();
        onSilence();
      }
    }, 100);
  }

  function startDetecting(
    stream: MediaStream,
    onSilence: () => void,
    _onCancel: () => void,
    onVolume?: (bars: number[]) => void,
    silenceThreshold = 15
  ) {
    stopInterval();

    const isChromeIOS = /CriOS/.test(navigator.userAgent);

    let ctx = contextRef.current;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioContext();
      contextRef.current = ctx;
    }

    let started = false;
    const setupAnalyser = () => {
      if (started) return;
      started = true;
      try {
        const analyser = ctx!.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx!.createMediaStreamSource(stream);
        source.connect(analyser);
        startAnalyserInterval(analyser, onSilence, onVolume, silenceThreshold);
      } catch {
        // createMediaStreamSource failed (known Chrome iOS / WKWebView issue)
        startFallbackTimer(onSilence, onVolume);
      }
    };

    const fallback = () => {
      if (started) return;
      started = true;
      startFallbackTimer(onSilence, onVolume);
    };

    if (ctx.state === "running") {
      setupAnalyser();
    } else {
      ctx.resume().then(setupAnalyser).catch(fallback);
      // If context never resumes (Chrome iOS can hang), start fallback after 500ms
      if (isChromeIOS) setTimeout(fallback, 500);
    }
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
