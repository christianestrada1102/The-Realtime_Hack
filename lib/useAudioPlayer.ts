"use client";

import { useCallback, useEffect, useRef, useState } from "react";

let audioContextUnlocked = false;
function unlockAudioContext() {
  if (audioContextUnlocked) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.resume().then(() => { audioContextUnlocked = true; });
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

export function useAudioPlayer() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedIntentionally = useRef(false);

  // Keep a stable base element — used to unlock HTMLAudioElement on iOS during a user gesture
  const baseElRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = document.createElement("audio");
    el.setAttribute("playsinline", "");
    el.setAttribute("preload", "auto");
    baseElRef.current = el;
    return () => { el.pause(); baseElRef.current = null; };
  }, []);

  // Call this from a direct user gesture (tap) on iOS to unlock HTMLAudio playback
  const unlockAudio = useCallback(() => {
    unlockAudioContext();
    const el = baseElRef.current;
    if (!el) return;
    el.play().then(() => el.pause()).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    stoppedIntentionally.current = true;
    // Abort any in-flight fetch to /api/speak
    abortRef.current?.abort();
    abortRef.current = null;
    // Pause and discard the current audio element
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      try { audio.src = ""; } catch {}
      audioRef.current = null;
    }
    // Revoke blob URL
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, onEnded?: () => void) => {
    // Reset intentional-stop flag and cancel previous
    stoppedIntentionally.current = false;
    stop();
    stoppedIntentionally.current = false; // reset again after stop() sets it true

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (stoppedIntentionally.current) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[useAudioPlayer] speak failed:", data.error ?? res.status);
        onEnded?.();
        return;
      }

      const blob = await res.blob();
      if (stoppedIntentionally.current) return;

      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      // Use the base element that was unlocked during the iOS tap gesture.
      // Clear all previous handlers before reuse to avoid stacked callbacks.
      const base = baseElRef.current;
      const audio = base ?? document.createElement("audio");
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.setAttribute("playsinline", "");
      audio.setAttribute("preload", "auto");
      audioRef.current = audio;

      audio.src = url;
      audio.load();

      audio.onended = () => {
        if (urlRef.current === url) { URL.revokeObjectURL(url); urlRef.current = null; }
        setIsSpeaking(false);
        onEnded?.();
      };

      audio.onerror = (e) => {
        if (stoppedIntentionally.current) return; // silently ignore — we caused this
        console.error("[useAudioPlayer] playback error", e);
        if (urlRef.current === url) { URL.revokeObjectURL(url); urlRef.current = null; }
        setIsSpeaking(false);
        onEnded?.();
      };

      setIsSpeaking(true);
      await audio.play().catch(async (err) => {
        if (stoppedIntentionally.current) return;
        if (err.name === "NotAllowedError") {
          unlockAudioContext();
          await new Promise((r) => setTimeout(r, 80));
          await audio.play().catch((e) => {
            if (stoppedIntentionally.current) return;
            console.error("[useAudioPlayer] play blocked after unlock:", e);
            setIsSpeaking(false);
            onEnded?.();
          });
        } else {
          console.error("[useAudioPlayer] play error:", err);
          setIsSpeaking(false);
          onEnded?.();
        }
      });
    } catch (err: any) {
      if (err?.name === "AbortError" || stoppedIntentionally.current) return;
      setIsSpeaking(false);
      console.error("[useAudioPlayer] speak error:", err);
      onEnded?.();
    }
  }, [stop]);

  return { speak, stop, isSpeaking, unlockAudio };
}
