"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// iOS requires AudioContext to be resumed from a user gesture.
// We unlock it once on first user interaction so subsequent programmatic
// audio.play() calls are allowed.
let audioContextUnlocked = false;
function unlockAudioContext() {
  if (audioContextUnlocked) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.resume().then(() => { audioContextUnlocked = true; });
    // Create and immediately discard a silent buffer — unlocks the audio engine
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

export function useAudioPlayer() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Use a persistent <audio> element mounted in the component — more reliable on iOS
  // than new Audio() created dynamically
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const el = document.createElement("audio");
    el.setAttribute("playsinline", "");   // critical for iOS — prevents fullscreen player
    el.setAttribute("preload", "auto");
    audioRef.current = el;
    return () => {
      el.pause();
      audioRef.current = null;
    };
  }, []);

  const speak = useCallback(async (text: string, onEnded?: () => void) => {
    const audio = audioRef.current;
    if (!audio) { onEnded?.(); return; }

    // Stop any current playback
    audio.pause();
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[useAudioPlayer] speak failed:", data.error ?? res.status);
        onEnded?.();
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      audio.src = url;
      audio.load();

      audio.onended = () => {
        if (urlRef.current === url) {
          URL.revokeObjectURL(url);
          urlRef.current = null;
        }
        setIsSpeaking(false);
        onEnded?.();
      };

      audio.onerror = (e) => {
        console.error("[useAudioPlayer] playback error", e);
        if (urlRef.current === url) {
          URL.revokeObjectURL(url);
          urlRef.current = null;
        }
        setIsSpeaking(false);
        onEnded?.();
      };

      setIsSpeaking(true);
      // play() returns a Promise — catch NotAllowedError (autoplay policy)
      await audio.play().catch(async (err) => {
        if (err.name === "NotAllowedError") {
          // Unlock attempt failed — try resuming via AudioContext then retry once
          unlockAudioContext();
          await new Promise((r) => setTimeout(r, 80));
          await audio.play().catch((e) => {
            console.error("[useAudioPlayer] play blocked after unlock attempt:", e);
            setIsSpeaking(false);
            onEnded?.();
          });
        } else {
          console.error("[useAudioPlayer] play error:", err);
          setIsSpeaking(false);
          onEnded?.();
        }
      });
    } catch (err) {
      setIsSpeaking(false);
      console.error("[useAudioPlayer] speak error:", err);
      onEnded?.();
    }
  }, []);

  return { speak, isSpeaking };
}
