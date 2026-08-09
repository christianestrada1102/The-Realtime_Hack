"use client";

import { useRef, useState } from "react";

const PREFERRED_MIME = "audio/webm";
const FALLBACK_MIME = "audio/mp4";

function getSupportedMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported(FALLBACK_MIME)) return FALLBACK_MIME;
  return null;
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((blob: Blob) => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording(): Promise<MediaStream | null> {
    setError(null);

    const mime = getSupportedMime();
    if (!mime) {
      setError("Tu navegador no soporta grabación de audio (MediaRecorder no disponible).");
      return null;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch {
      setError("Permiso de micrófono denegado.");
      return null;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunksRef.current, { type: mime });
      resolveRef.current?.(blob);
      resolveRef.current = null;
    };

    recorder.start();
    setIsRecording(true);
    return stream;
  }

  function stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      recorderRef.current?.stop();
      setIsRecording(false);
    });
  }

  function cancelRecording() {
    resolveRef.current = null;
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  return { startRecording, stopRecording, cancelRecording, isRecording, error };
}
