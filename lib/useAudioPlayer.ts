"use client";

import { useRef, useState } from "react";

export function useAudioPlayer() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speak(text: string) {
    // Stop any ongoing playback
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
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
        console.error("[useAudioPlayer] Audio playback error");
      };

      await audio.play();
    } catch (err) {
      setIsSpeaking(false);
      console.error("[useAudioPlayer] speak error:", err);
    }
  }

  return { speak, isSpeaking };
}
