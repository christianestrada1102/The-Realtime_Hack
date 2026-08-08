"use client";

import { useChannel } from "@portalsdk/react";
import { useState } from "react";

type ChatContent = { text: string };

export function SessionView({ sessionId }: { sessionId: string }) {
  const channelId = `session-${sessionId}`;
  const { messages, send, status } = useChannel<ChatContent>({ channelId });
  const [draft, setDraft] = useState("");

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    send({ content: { text } });
    setDraft("");
  }

  const connected = status === "ready";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-semibold">Sesión: {sessionId}</h2>

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
      </div>

      <div className="w-full max-w-lg bg-zinc-900 rounded-lg p-4 min-h-48 flex flex-col gap-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center my-auto">
            Canal {channelId} — esperando mensajes…
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="text-zinc-500 font-mono mr-2">
                {m.sender.anon ? "anon" : m.sender.id}:
              </span>
              <span>{m.content.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex w-full max-w-lg gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escribe un mensaje…"
          className="flex-1 bg-zinc-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || !connected}
          className="px-4 py-2 bg-zinc-100 text-zinc-950 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-white transition-colors"
        >
          Enviar
        </button>
      </div>

      <p className="text-xs text-zinc-600 font-mono">channel: {channelId}</p>
    </main>
  );
}
