"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useIsMobile";
import type { FeedbackData } from "@/app/api/feedback/route";

type HistoryEntry = { role: "user" | "interviewer"; content: string };

interface Props {
  history: HistoryEntry[];
}

function useFadeIn(index: number, ready: boolean) {
  return {
    opacity: ready ? 1 : 0,
    transform: ready ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.4s ease ${index * 150}ms, transform 0.4s ease ${index * 150}ms`,
  };
}

export function FeedbackScreen({ history }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history }),
        });
        const data = await res.json();
        if (!res.ok || data.error) { setError(data.error ?? "Error al generar feedback"); return; }
        setFeedback(data as FeedbackData);
        // Trigger stagger after a small paint delay
        setTimeout(() => setVisible(true), 60);
      } catch {
        setError("No se pudo conectar con el servidor");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scorePercent = feedback ? Math.min(100, (feedback.score / 10) * 100) : 0;

  const topicStyle = (level: "strong" | "medium" | "weak") => ({
    border: `1px solid ${level === "strong" ? "#fff" : level === "weak" ? "#ef4444" : "#333"}`,
    color: level === "strong" ? "#fff" : level === "weak" ? "#ef4444" : "#555",
    borderRadius: 6,
    padding: "4px 10px",
    fontFamily: "monospace",
    fontSize: 11,
    background: "none",
    display: "inline-block",
  });

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: isMobile ? "40px 20px 60px" : "64px 24px 80px" }}>

        {/* Poised wordmark */}
        <p style={{
          fontFamily: "Manuscribe, serif", fontSize: 14, color: "#333",
          textAlign: "center", marginBottom: 8,
        }}>
          Poised
        </p>
        <p style={{
          fontFamily: "monospace", fontSize: 11, color: "#555",
          textAlign: "center", marginBottom: 48,
        }}>
          Resultado de tu entrevista
        </p>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <p style={{ fontFamily: "monospace", fontSize: 13, color: "#555" }}>
              Analizando tu entrevista
              <span style={{ animation: "dots 1.2s steps(3, end) infinite" }}>...</span>
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontFamily: "monospace", fontSize: 12, color: "#ef4444", textAlign: "center" }}>
            {error}
          </p>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

            {/* Score */}
            <div style={{ textAlign: "center", ...useFadeIn(0, visible) }}>
              <p style={{ fontFamily: "Manuscribe, serif", fontSize: isMobile ? 64 : 96, color: "#fff", margin: 0, lineHeight: 1 }}>
                {feedback.score.toFixed(1)}
              </p>
              {/* Score bar */}
              <div style={{
                height: 2, backgroundColor: "#1a1a1a",
                borderRadius: 2, marginTop: 16, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", backgroundColor: "#fff",
                  width: `${scorePercent}%`,
                  transition: "width 0.8s ease 0.6s",
                }} />
              </div>
              <p style={{ fontFamily: "monospace", fontSize: 12, color: "#555", marginTop: 12 }}>
                {feedback.summary}
              </p>
            </div>

            {/* Topics */}
            <div style={useFadeIn(1, visible)}>
              <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", marginBottom: 12 }}>
                temas evaluados
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {feedback.topics.map((t, i) => (
                  <span key={i} style={topicStyle(t.level)}>{t.name}</span>
                ))}
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: isMobile ? 24 : 32,
              ...useFadeIn(2, visible),
            }}>
              <div>
                <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", marginBottom: 12 }}>
                  lo que dominaste
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {feedback.strengths.map((s, i) => (
                    <li key={i} style={{ fontFamily: "monospace", fontSize: 13, color: "#e4e4e7" }}>
                      — {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", marginBottom: 12 }}>
                  donde mejorar
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {feedback.weaknesses.map((w, i) => (
                    <li key={i} style={{ fontFamily: "monospace", fontSize: 13, color: "#71717a" }}>
                      — {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendation */}
            <div style={{ ...useFadeIn(3, visible), borderTop: "1px solid #1a1a1a", paddingTop: 32 }}>
              <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", marginBottom: 12 }}>
                proximos pasos
              </p>
              <p style={{ fontFamily: "monospace", fontSize: 13, color: "#888", lineHeight: 1.8 }}>
                {feedback.recommendation}
              </p>
            </div>

            {/* CTA */}
            <div style={{ ...useFadeIn(4, visible), textAlign: "center", paddingTop: 16 }}>
              <button
                onClick={() => router.push("/")}
                style={{
                  background: "none",
                  border: "1px solid #333",
                  borderRadius: 6,
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: 13,
                  padding: "12px 28px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#555")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
              >
                Nueva entrevista
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
        @keyframes dots {
          0%   { clip-path: inset(0 67% 0 0); }
          33%  { clip-path: inset(0 34% 0 0); }
          66%  { clip-path: inset(0 0% 0 0); }
          100% { clip-path: inset(0 67% 0 0); }
        }
      `}</style>
    </div>
  );
}
