"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackData } from "@/app/api/feedback/route";

type SessionRow = {
  id: string;
  createdAt: string;
  score: number | null;
  duration: number | null;
};

type SessionDetail = SessionRow & {
  history: Array<{ role: "user" | "interviewer"; content: string }>;
  feedback: FeedbackData;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

const C = {
  bg: "#0a0a0a",
  white: "#fff",
  mid: "#aaa",
  low: "#666",
  dim: "#333",
  border: "#222",
};

export default function HistorialPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch("/api/sessions/list")
      .then((r) => r.json())
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/sessions/${id}`);
      const data = await res.json();
      setSelected(data);
    } finally {
      setLoadingDetail(false);
    }
  }

  const topicColor = (level: "strong" | "medium" | "weak") =>
    level === "strong" ? C.white : level === "weak" ? "#ef4444" : C.dim;

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh", color: C.white }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "64px 24px 80px" }}>

        {/* Header */}
        <a href="/" style={{ fontFamily: "Manuscribe, serif", fontSize: 18, color: C.white, textDecoration: "none", display: "block", marginBottom: 40 }}>
          Poised
        </a>

        <h1 style={{ fontFamily: "Manuscribe, serif", fontSize: 28, color: C.white, margin: "0 0 8px" }}>
          Tus entrevistas
        </h1>
        <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", margin: "0 0 48px", letterSpacing: "0.06em" }}>
          historial de sesiones
        </p>

        {/* List */}
        {loading && (
          <p style={{ fontFamily: "monospace", fontSize: 12, color: "#555" }}>Cargando...</p>
        )}

        {!loading && sessions.length === 0 && (
          <p style={{ fontFamily: "monospace", fontSize: 12, color: "#555" }}>
            No hay entrevistas guardadas aún.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {sessions.map((s, i) => (
            <div
              key={s.id}
              style={{
                borderTop: `1px solid ${C.border}`,
                borderBottom: i === sessions.length - 1 ? `1px solid ${C.border}` : "none",
                padding: "20px 0",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                <span style={{ fontFamily: "Manuscribe, serif", fontSize: 32, color: C.white, lineHeight: 1 }}>
                  {s.score ?? "—"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555" }}>
                    {s.createdAt ? formatDate(s.createdAt) : "—"}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: C.dim }}>
                    {formatDuration(s.duration)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => openDetail(s.id)}
                style={{
                  background: "none", border: `1px solid ${C.dim}`, borderRadius: 6,
                  color: C.mid, fontFamily: "monospace", fontSize: 11,
                  padding: "8px 16px", cursor: "pointer", transition: "border-color 200ms, color 200ms",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = C.white; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.dim; e.currentTarget.style.color = C.mid; }}
              >
                Ver detalle
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal detalle */}
      {(selected || loadingDetail) && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
            animation: "fade-in 0.15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#111", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "32px 28px",
              width: "100%", maxWidth: 540,
              maxHeight: "85vh", overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 28,
              animation: "modal-in 0.15s ease",
            }}
          >
            {loadingDetail && !selected && (
              <p style={{ fontFamily: "monospace", fontSize: 12, color: "#555", textAlign: "center" }}>Cargando...</p>
            )}

            {selected && (
              <>
                {/* Score */}
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "Manuscribe, serif", fontSize: 72, color: C.white, margin: 0, lineHeight: 1 }}>
                    {selected.feedback?.score?.toFixed(1) ?? "—"}
                  </p>
                  <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", marginTop: 8 }}>
                    {selected.createdAt ? formatDate(selected.createdAt) : "—"} · {formatDuration(selected.duration)}
                  </p>
                  <p style={{ fontFamily: "monospace", fontSize: 12, color: C.mid, marginTop: 12, lineHeight: 1.7 }}>
                    {selected.feedback?.summary}
                  </p>
                </div>

                {/* Topics */}
                {selected.feedback?.topics?.length > 0 && (
                  <div>
                    <p style={{ fontFamily: "monospace", fontSize: 10, color: "#555", marginBottom: 10 }}>temas evaluados</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selected.feedback.topics.map((t, i) => (
                        <span key={i} style={{
                          fontFamily: "monospace", fontSize: 10,
                          border: `1px solid ${topicColor(t.level)}`,
                          color: topicColor(t.level),
                          borderRadius: 4, padding: "3px 8px",
                        }}>{t.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code review */}
                {selected.feedback?.codeReview && (
                  <div style={{ borderTop: `1px solid #1a1a1a`, paddingTop: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <p style={{ fontFamily: "monospace", fontSize: 10, color: "#555", margin: 0 }}>ejercicio de código</p>
                      <span style={{
                        fontFamily: "monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4,
                        border: `1px solid ${selected.feedback.codeReview.verdict === "correcto" ? C.white : selected.feedback.codeReview.verdict === "parcial" ? "#888" : "#ef4444"}`,
                        color: selected.feedback.codeReview.verdict === "correcto" ? C.white : selected.feedback.codeReview.verdict === "parcial" ? "#888" : "#ef4444",
                      }}>{selected.feedback.codeReview.verdict}</span>
                    </div>
                    <p style={{ fontFamily: "monospace", fontSize: 11, color: C.low, marginBottom: 12, lineHeight: 1.6 }}>{selected.feedback.codeReview.problem}</p>
                    <p style={{ fontFamily: "monospace", fontSize: 11, color: C.mid, lineHeight: 1.7, marginBottom: 8 }}>{selected.feedback.codeReview.what_worked}</p>
                    <p style={{ fontFamily: "monospace", fontSize: 11, color: "#71717a", lineHeight: 1.7 }}>{selected.feedback.codeReview.what_to_improve}</p>
                  </div>
                )}

                {/* Strengths / Weaknesses */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderTop: `1px solid #1a1a1a`, paddingTop: 20 }}>
                  <div>
                    <p style={{ fontFamily: "monospace", fontSize: 10, color: "#555", marginBottom: 10 }}>lo que dominaste</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      {selected.feedback?.strengths?.map((s, i) => (
                        <li key={i} style={{ fontFamily: "monospace", fontSize: 11, color: "#e4e4e7", lineHeight: 1.6 }}>— {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p style={{ fontFamily: "monospace", fontSize: 10, color: "#555", marginBottom: 10 }}>donde mejorar</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      {selected.feedback?.weaknesses?.map((w, i) => (
                        <li key={i} style={{ fontFamily: "monospace", fontSize: 11, color: "#71717a", lineHeight: 1.6 }}>— {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ borderTop: `1px solid #1a1a1a`, paddingTop: 20 }}>
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: "#555", marginBottom: 10 }}>proximos pasos</p>
                  <p style={{ fontFamily: "monospace", fontSize: 11, color: "#888", lineHeight: 1.8 }}>{selected.feedback?.recommendation}</p>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button
                    onClick={() => { setSelected(null); router.push("/"); }}
                    style={{
                      flex: 1, background: "#fff", border: "none", borderRadius: 6,
                      color: "#000", fontFamily: "monospace", fontSize: 13,
                      padding: "12px", cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    Reintentar entrevista
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      flex: 1, background: "none", border: `1px solid #333`, borderRadius: 6,
                      color: "#555", fontFamily: "monospace", fontSize: 13,
                      padding: "12px", cursor: "pointer",
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
