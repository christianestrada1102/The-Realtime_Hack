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
  // Ref mirrors isSpeaking but updates synchronously — safe to read in callbacks
  const isSpeakingRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedIntentionally = useRef(false);

  const setSpeaking = (val: boolean) => {
    isSpeakingRef.current = val;
    setIsSpeaking(val);
  };

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
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      try { audio.src = ""; } catch {}
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, onEnded?: () => void) => {
    stoppedIntentionally.current = false;
    stop();
    stoppedIntentionally.current = false;

    // Mark speaking immediately — ref updates sync so startListening guard sees it right away
    setSpeaking(true);

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
        setSpeaking(false);
        onEnded?.();
        return;
      }

      const blob = await res.blob();
      if (stoppedIntentionally.current) return;

      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      // iOS requires reusing the same element that was unlocked during the tap gesture.
      // Other browsers (Chrome, Firefox) allow fresh elements after any user gesture.
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const audio = (isIOS && baseElRef.current) ? baseElRef.current : (() => {
        const el = document.createElement("audio");
        el.setAttribute("playsinline", "");
        el.setAttribute("preload", "auto");
        return el;
      })();
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = audio;

      audio.src = url;
      audio.load();

      audio.onended = () => {
        if (urlRef.current === url) { URL.revokeObjectURL(url); urlRef.current = null; }
        setSpeaking(false);   // ref updated sync — startListening guard sees false immediately
        onEnded?.();
      };

      audio.onerror = (e) => {
        if (stoppedIntentionally.current) return;
        console.error("[useAudioPlayer] playback error", e);
        if (urlRef.current === url) { URL.revokeObjectURL(url); urlRef.current = null; }
        setSpeaking(false);
        onEnded?.();
      };

      await audio.play().catch(async (err) => {
        if (stoppedIntentionally.current) return;
        if (err.name === "NotAllowedError") {
          unlockAudioContext();
          await new Promise((r) => setTimeout(r, 80));
          await audio.play().catch((e) => {
            if (stoppedIntentionally.current) return;
            console.error("[useAudioPlayer] play blocked after unlock:", e);
            setSpeaking(false);
            onEnded?.();
          });
        } else {
          console.error("[useAudioPlayer] play error:", err);
          setSpeaking(false);
          onEnded?.();
        }
      });
    } catch (err: any) {
      if (err?.name === "AbortError" || stoppedIntentionally.current) return;
      setSpeaking(false);
      console.error("[useAudioPlayer] speak error:", err);
      onEnded?.();
    }
  }, [stop]);

  return { speak, stop, isSpeaking, isSpeakingRef, unlockAudio };
}
