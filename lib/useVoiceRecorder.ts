"use client";

import { useRef, useState } from "react";

// Ordered by preference: webm (Chrome/Firefox), mp4 (Safari/iOS), ogg (Firefox fallback)
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function getSupportedMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const mime of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {}
  }
  return undefined; // let browser decide — last resort for Chrome iOS WKWebView
}

function mimeToExt(mime: string | undefined): string {
  if (!mime) return "webm";
  if (mime.startsWith("audio/mp4")) return "mp4";
  if (mime.startsWith("audio/ogg")) return "ogg";
  return "webm";
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((blob: Blob) => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string | undefined>(undefined);

  async function startRecording(): Promise<MediaStream | null> {
    setError(null);

    if (typeof MediaRecorder === "undefined") {
      setError("Tu navegador no soporta grabación de audio.");
      return null;
    }

    let stream: MediaStream;
    try {
      const isChromeIOS = /CriOS/.test(navigator.userAgent);
      const isSafariIOS = !isChromeIOS && (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: !isSafariIOS,
          autoGainControl: !isSafariIOS,
          channelCount: 1,
        },
      });
    } catch {
      setError("Permiso de micrófono denegado.");
      return null;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mime = getSupportedMime();
    mimeRef.current = mime;

    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch {
      // Explicit mimeType rejected — fall back to browser default
      try {
        recorder = new MediaRecorder(stream);
        mimeRef.current = undefined;
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        setError("Tu navegador no soporta grabación de audio.");
        return null;
      }
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blobMime = mimeRef.current ?? recorder.mimeType ?? "audio/webm";
      const blob = new Blob(chunksRef.current, { type: blobMime });
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

  function getRecordingExt(): string {
    return mimeToExt(mimeRef.current ?? recorderRef.current?.mimeType);
  }

  return { startRecording, stopRecording, cancelRecording, isRecording, error, getRecordingExt };
}
