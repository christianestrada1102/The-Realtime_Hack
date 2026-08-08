"use client";

import { useChannel } from "@portalsdk/react";
import { useEffect, useRef, useState } from "react";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { useAudioPlayer } from "@/lib/useAudioPlayer";

type ChatContent = { text: string; role?: "user" | "interviewer" | "observer" };

export function SessionView({ sessionId }: { sessionId: string }) {
  const channelId = `session-${sessionId}`;
  const { messages, send, status } = useChannel<ChatContent>({ channelId });
  const { startRecording, stopRecording, isRecording, error: recorderError } = useVoiceRecorder();
  const { speak, isSpeaking } = useAudioPlayer();
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Auto-speak incoming interviewer messages
  const spokenIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const last = messages.at(-1);
    if (!last) return;
    if (last.content.role !== "interviewer") return;
    if (spokenIds.current.has(last.id)) return;
    spokenIds.current.add(last.id);
    speak(last.content.text);
  }, [messages, speak]);

  const connected = status === "ready";
  const pttDisabled = !connected || transcribing || isSpeaking;
  const anyError = recorderError ?? transcribeError;

  async function handlePressStart() {
    await startRecording();
  }

  async function handlePressEnd() {
    if (!isRecording) return;
    setTranscribeError(null);
    setTranscribing(true);
    try {
      const blob = await stopRecording();
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) {
        setTranscribeError(data.error ?? "Error al transcribir");
        return;
      }
      const text: string = data.text?.trim();
      if (!text) return;
      await send({ content: { text, role: "user" } });
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setTranscribing(false);
    }
  }

  async function handleTestVoice() {
    await speak("Hola, bienvenido a tu entrevista técnica. Cuéntame sobre ti.");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-semibold">Sesión: {sessionId}</h2>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full ${
            connected
              ? "bg-green-400"
              : status === "connecting" || status === "reconnecting"
              ? "bg-yellow-400 animate-pulse"
              : status === "blocked"
              ? "bg-red-400"
              : "bg-zinc-600"
          }`}
        />
        <span className="text-sm text-zinc-400 capitalize">{status}</span>
        {isSpeaking && (
          <span className="text-xs text-blue-400 animate-pulse ml-2">🔊 Entrevistador hablando…</span>
        )}
      </div>

      {/* Message log */}
      <div className="w-full max-w-lg bg-zinc-900 rounded-lg p-4 min-h-48 flex flex-col gap-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center my-auto">
            Canal {channelId} — esperando mensajes…
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`text-sm ${m.content.role === "user" ? "text-right" : "text-left"}`}
            >
              <span className="text-zinc-500 font-mono mr-2 text-xs">
                {m.content.role ?? (m.sender.anon ? "anon" : m.sender.id)}
              </span>
              <span>{m.content.text}</span>
            </div>
          ))
        )}
        {transcribing && (
          <p className="text-xs text-zinc-500 animate-pulse text-right">Transcribiendo…</p>
        )}
      </div>

      {/* Error */}
      {anyError && (
        <p className="text-sm text-red-400 max-w-lg text-center">{anyError}</p>
      )}

      {/* Push-to-talk */}
      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onTouchStart={(e) => { e.preventDefault(); handlePressStart(); }}
        onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
        disabled={pttDisabled}
        className={`w-48 h-48 rounded-full font-medium text-sm transition-all select-none
          ${isRecording
            ? "bg-red-500 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-pulse"
            : "bg-zinc-100 text-zinc-950 hover:bg-white active:scale-95"
          }
          disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isRecording
          ? "🔴 Grabando…"
          : transcribing
          ? "Transcribiendo…"
          : isSpeaking
          ? "Escucha…"
          : "Mantén presionado\npara hablar"}
      </button>

      {/* Test voice button */}
      <button
        onClick={handleTestVoice}
        disabled={isSpeaking}
        className="px-4 py-2 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
      >
        🧪 Test voz
      </button>

      <p className="text-xs text-zinc-600 font-mono">channel: {channelId}</p>
    </main>
  );
}
