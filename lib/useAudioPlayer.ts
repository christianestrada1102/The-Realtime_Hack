"use client";

import { useCallback, useRef, useState } from "react";

export function useAudioPlayer() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, onEnded?: () => void) => {
    console.log("speak called with:", text.slice(0, 30));
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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
      const audio = new Audio(url);
      audioRef.current = audio;

      setIsSpeaking(true);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
        onEnded?.();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
        console.error("[useAudioPlayer] Audio playback error");
        onEnded?.();
      };

      await audio.play();
    } catch (err) {
      setIsSpeaking(false);
      console.error("[useAudioPlayer] speak error:", err);
      onEnded?.();
    }
  }, []);

  return { speak, isSpeaking };
}
