"use client";

import { useEffect, useState } from "react";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export function SessionView({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog((prev) => [...prev, `[${new Date().toISOString()}] ${msg}`]);

  async function connect() {
    setStatus("connecting");
    addLog("Iniciando conexión con Portal...");

    try {
      const res = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      addLog(`Sesión creada: ${data.sessionId}`);
      setStatus("connected");
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-semibold">Sesión: {sessionId}</h2>

      <div className="flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full ${
            status === "connected"
              ? "bg-green-400"
              : status === "connecting"
              ? "bg-yellow-400 animate-pulse"
              : status === "error"
              ? "bg-red-400"
              : "bg-zinc-600"
          }`}
        />
        <span className="text-sm text-zinc-400 capitalize">{status}</span>
      </div>

      {status === "idle" && (
        <button
          onClick={connect}
          className="px-6 py-3 bg-zinc-100 text-zinc-950 rounded-lg font-medium hover:bg-white transition-colors"
        >
          Conectar canal Portal
        </button>
      )}

      {status === "error" && (
        <button
          onClick={() => {
            setStatus("idle");
            setLog([]);
          }}
          className="px-4 py-2 border border-zinc-700 rounded-lg text-sm hover:border-zinc-500 transition-colors"
        >
          Reintentar
        </button>
      )}

      {log.length > 0 && (
        <div className="w-full max-w-lg bg-zinc-900 rounded-lg p-4 font-mono text-xs text-zinc-400 space-y-1">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </main>
  );
}
