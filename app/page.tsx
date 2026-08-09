"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];

export default function Home() {
  const router = useRouter();
  const [duration, setDuration] = useState(45);

  function handleStart() {
    router.push(`/session/test-session?duration=${duration}`);
  }

  return (
    <main style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, padding: 32 }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "Manuscribe, serif", fontSize: 40, color: "#fff", margin: 0 }}>Poised</h1>
        <p style={{ fontFamily: "monospace", fontSize: 12, color: "#555", marginTop: 8 }}>
          Simulador de entrevistas tecnicas con presion real.
        </p>
      </div>

      {/* Duration selector */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, color: "#444", margin: 0 }}>
          duracion de la sesion
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              style={{
                background: "none",
                border: `1px solid ${duration === d.value ? "#fff" : "#333"}`,
                borderRadius: 6,
                color: duration === d.value ? "#fff" : "#555",
                fontFamily: "monospace",
                fontSize: 13,
                padding: "8px 18px",
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        style={{
          background: "#fff",
          border: "none",
          borderRadius: 6,
          color: "#000",
          fontFamily: "monospace",
          fontSize: 13,
          padding: "12px 32px",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#e4e4e7")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
      >
        Iniciar entrevista
      </button>
    </main>
  );
}
