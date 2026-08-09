"use client";

import { useChannel } from "@portalsdk/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FeedbackScreen } from "./FeedbackScreen";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { useAudioPlayer } from "@/lib/useAudioPlayer";
import { useSilenceDetector } from "@/lib/useSilenceDetector";

const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), { ssr: false });

type ChatContent = { text: string; role?: "user" | "interviewer" | "observer" };
type Phase = "idle" | "speaking" | "listening" | "processing" | "ended";
type HistoryEntry = { role: "user" | "interviewer"; content: string };

const CODE_KEYWORDS = /implementa|escribe|código|función|algorithm|implementarías|codifica|define la función/i;

// SVG noise data URI — subtle grain texture
const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export function SessionView({ sessionId }: { sessionId: string }) {
  const channelId = `session-${sessionId}`;
  const { send, status } = useChannel<ChatContent>({ channelId });
  const { startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { speak } = useAudioPlayer();
  const { startDetecting, stopDetecting } = useSilenceDetector();

  // Detect query params (client-side only)
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [totalSeconds, setTotalSeconds] = useState(2700); // default 45 min
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTextMode(params.get("mode") === "text");
    const dur = parseInt(params.get("duration") ?? "45", 10);
    setTotalSeconds((isNaN(dur) ? 45 : dur) * 60);
  }, []);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastInterviewerMsg, setLastInterviewerMsg] = useState("");
  const [msgKey, setMsgKey] = useState(0); // triggers fade-in animation
  const [showEditor, setShowEditor] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [codeValue, setCodeValue] = useState("// Escribe tu solución aquí\n");
  const [waveformBars, setWaveformBars] = useState<number[]>([4, 4, 4, 4, 4]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null); // seconds left, null until session starts
  const warned5MinRef = useRef(false);
  const timeUpRef = useRef(false);

  const historyRef = useRef<HistoryEntry[]>([]);
  const [historyDisplay, setHistoryDisplay] = useState<HistoryEntry[]>([]);
  const router = useRouter();
  const startedRef = useRef(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  function appendHistory(entry: HistoryEntry) {
    historyRef.current = [...historyRef.current, entry];
    setHistoryDisplay(historyRef.current);
  }

  // Countdown timer — only runs while session is active
  useEffect(() => {
    if (!sessionStarted || phase === "ended") return;
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);

      // 5-minute warning
      if (left <= 300 && !warned5MinRef.current) {
        warned5MinRef.current = true;
        const msg = "Por cierto, nos quedan unos 5 minutos — vamos terminando.";
        send({ content: { text: msg, role: "interviewer" } });
        appendHistory({ role: "interviewer", content: msg });
        setLastInterviewerMsg(msg);
        setMsgKey((k) => k + 1);
        speak(msg);
      }

      // Time's up
      if (left === 0 && !timeUpRef.current) {
        timeUpRef.current = true;
        clearInterval(t);
        const closing = "Bien, hemos llegado al final del tiempo. Ha sido una buena conversación — te contactaremos con los resultados. Gracias por tu tiempo.";
        send({ content: { text: closing, role: "interviewer" } });
        appendHistory({ role: "interviewer", content: closing });
        setLastInterviewerMsg(closing);
        setMsgKey((k) => k + 1);
        setPhase("speaking");
        speak(closing, () => {
          stopDetecting();
          cancelRecording();
          setPhase("ended");
          setShowFeedback(true);
        });
      }
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStarted, phase, totalSeconds]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  // Auto-scroll transcript panel
  useEffect(() => {
    if (showTranscript) transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historyDisplay, showTranscript]);

  async function callInterviewer(message: string) {
    setPhase("processing");
    try {
      const iRes = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historyRef.current.slice(0, -1),
          config: { type: "tecnica", level: "mid", language: "es" },
        }),
      });
      const iData = await iRes.json();
      if (!iRes.ok || iData.error) {
        setError(iData.error ?? "Error del entrevistador");
        setPhase("idle");
        return;
      }
      const reply: string = iData.response;
      if (iData.showEditor || CODE_KEYWORDS.test(reply)) setShowEditor(true);
      await send({ content: { text: reply, role: "interviewer" } });
      appendHistory({ role: "interviewer", content: reply });
      setLastInterviewerMsg(reply);
      setMsgKey((k) => k + 1);
      setPhase("speaking");
      speak(reply, () => startListeningRef.current());
    } catch {
      setError("Error al contactar al entrevistador");
      setPhase("idle");
    }
  }

  async function processUserAudio(blob: Blob) {
    setWaveformBars([4, 4, 4, 4, 4]);
    const form = new FormData();
    form.append("audio", blob, "audio.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok || data.error) {
      setError(data.error ?? "Error al transcribir");
      setPhase("idle");
      return;
    }
    let text: string = data.text?.trim() ?? "";
    if (!text) { startListeningRef.current(); return; }

    if (showEditor && codeValue.trim() && codeValue.trim() !== "// Escribe tu solución aquí") {
      text = `[CÓDIGO ENVIADO]\n\`\`\`js\n${codeValue.trim()}\n\`\`\`\n${text}`;
    }

    await send({ content: { text: data.text?.trim(), role: "user" } });
    appendHistory({ role: "user", content: data.text?.trim() });
    await callInterviewer(text);
  }

  async function startListening() {
    setPhase("listening");
    const stream = await startRecording();
    if (!stream) { setPhase("idle"); return; }
    startDetecting(
      stream,
      async () => {
        setPhase("processing");
        try {
          const blob = await stopRecording();
          await processUserAudio(blob);
        } catch {
          setError("Error al procesar audio");
          setPhase("idle");
        }
      },
      () => { cancelRecording(); startListeningRef.current(); },
      (bars) => setWaveformBars(bars)
    );
  }

  // En modo texto no hay grabación ni detector de silencio —
  // cuando Ana termina de hablar solo ponemos la fase en idle y esperamos Enter
  startListeningRef.current = textMode
    ? () => setPhase("idle")
    : startListening;

  async function handleTextSubmit() {
    const text = textInput.trim();
    if (!text || phase === "processing" || phase === "speaking") return;
    setTextInput("");
    await send({ content: { text, role: "user" } });
    appendHistory({ role: "user", content: text });
    await callInterviewer(text);
  }

  async function startInterview() {
    setPhase("processing");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "START_INTERVIEW", history: [], config: { type: "tecnica", level: "mid", language: "es" } }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Error al iniciar"); setPhase("idle"); return; }
      const reply: string = data.response;
      await send({ content: { text: reply, role: "interviewer" } });
      historyRef.current = [{ role: "interviewer", content: reply }];
      setHistoryDisplay(historyRef.current);
      setLastInterviewerMsg(reply);
      setMsgKey(1);
      setPhase("speaking");
      speak(reply, () => startListeningRef.current());
    } catch {
      setError("Error al iniciar entrevista"); setPhase("idle");
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    if (status !== "ready") return;
    startedRef.current = true;
    setSessionStarted(true);
    startInterview();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before closing tab/window
  useEffect(() => {
    if (!sessionStarted || phase === "ended") return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [sessionStarted, phase]);

  // Intercept internal link clicks → show custom modal instead of navigating
  useEffect(() => {
    if (!sessionStarted || phase === "ended") return;
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      e.preventDefault();
      setPendingNavigation(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [sessionStarted, phase]);

  function confirmLeave() {
    stopDetecting();
    cancelRecording();
    setPhase("ended");
    setPendingNavigation(null);
    setShowFeedback(true);
  }

  function cancelLeave() {
    setPendingNavigation(null);
  }

  function handleEnd() {
    stopDetecting();
    cancelRecording();
    setPhase("ended");
    setShowFeedback(true);
  }

  const isSpeaking = phase === "speaking";
  const isListening = phase === "listening";

  if (showFeedback) {
    return <FeedbackScreen history={historyRef.current} />;
  }

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh" }} className="flex flex-col text-white overflow-hidden">

      {/* ── Header ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
        height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px",
        backgroundColor: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a",
      }}>
        <span style={{ fontFamily: "Manuscribe, serif", fontSize: 16, color: "#fff", letterSpacing: "0.02em" }}>
          Poised
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555" }}>
          Entrevista técnica · Mid
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{
            fontFamily: "monospace", fontSize: 11,
            color: remaining !== null && remaining <= 300 ? "#ef4444" : "#444",
          }}>
            {remaining !== null ? formatTime(remaining) : "--:--"}
          </span>
          <button
            onClick={() => setShowTranscript(true)}
            style={{ fontFamily: "monospace", fontSize: 11, color: "#555", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#aaa")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            Ver transcripcion
          </button>
          {phase !== "ended" && (
            <button
              onClick={handleEnd}
              style={{ fontFamily: "inherit", fontSize: 13, color: "#555", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Terminar
            </button>
          )}
        </div>
      </header>

      {/* ── Zona superior: Entrevistador (60%) ── */}
      <div style={{
        flex: "0 0 60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        paddingTop: 48,
        backgroundColor: "#111111",
        backgroundImage: NOISE_BG,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        borderBottom: "1px solid #1a1a1a",
        position: "relative",
      }}>

        {/* Avatar con anillo de estado */}
        <div style={{ position: "relative", width: 120, height: 120 }}>
          {/* Anillo exterior animado */}
          {(isSpeaking || isListening) && (
            <div style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              border: `2px solid ${isSpeaking ? "#ffffff" : "#22c55e"}`,
              opacity: 0.5,
              animation: "ring-pulse 1.6s ease-in-out infinite",
            }} />
          )}
          {/* Círculo avatar */}
          <div style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "Manuscribe, serif",
              fontSize: 48,
              color: "#fff",
              lineHeight: 1,
              userSelect: "none",
            }}>
              A
            </span>
          </div>
        </div>

        {/* Nombre y cargo */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "Manuscribe, serif", fontSize: 20, color: "#fff", margin: 0 }}>Ana</p>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", margin: "4px 0 0" }}>
            Senior Engineer · Poised
          </p>
        </div>

        {/* Último mensaje — subtítulo con fade-in */}
        <div style={{ maxWidth: 480, textAlign: "center", minHeight: 44, padding: "0 24px" }}>
          {lastInterviewerMsg && (
            <p
              key={msgKey}
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                color: "#888",
                lineHeight: 1.6,
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                animation: "fade-in 0.4s ease",
              }}
            >
              {lastInterviewerMsg}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#f87171", position: "absolute", bottom: 16 }}>
            {error}
          </p>
        )}
      </div>

      {/* ── Zona inferior: Usuario (40%) ── */}
      <div style={{
        flex: "0 0 40vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        backgroundColor: "#0a0a0a",
        padding: "0 24px",
        position: "relative",
      }}>

        {textMode && !showEditor ? (
          /* Modo texto — input simple, salta Whisper */
          <div style={{ width: "100%", maxWidth: 560, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
              placeholder="Escribe tu respuesta..."
              disabled={phase === "processing" || phase === "speaking" || phase === "ended"}
              style={{
                flex: 1,
                backgroundColor: "#111",
                border: "1px solid #333",
                borderRadius: 6,
                color: "#fff",
                fontFamily: "monospace",
                fontSize: 13,
                padding: "8px 12px",
                outline: "none",
              }}
            />
            <button
              onClick={handleTextSubmit}
              disabled={phase === "processing" || phase === "speaking" || phase === "ended"}
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#555",
                background: "none",
                border: "1px solid #333",
                borderRadius: 6,
                padding: "8px 12px",
                cursor: "pointer",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#aaa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Enviar
            </button>
          </div>
        ) : showEditor ? (
          /* Editor de código — reemplaza zona inferior */
          <div style={{
            width: "100%", maxWidth: 640,
            border: "1px solid #222",
            borderRadius: 8,
            backgroundColor: "#0d0d0d",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px",
              borderBottom: "1px solid #1a1a1a",
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#444" }}>
                // Escribe tu solucion
              </span>
              <button
                onClick={() => setShowEditor(false)}
                style={{ fontFamily: "monospace", fontSize: 11, color: "#444", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
              >
                cerrar
              </button>
            </div>
            <div style={{ height: 160 }}>
              <CodeEditor value={codeValue} onChange={setCodeValue} />
            </div>
          </div>
        ) : (
          /* Estado normal — indicador + waveform */
          <>
            {/* Indicador de estado */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor:
                  isListening ? "#ef4444" :
                  phase === "processing" || isSpeaking ? "#ffffff" :
                  phase === "ended" ? "#333" : "#333",
                animation: (isListening || isSpeaking || phase === "processing")
                  ? "dot-pulse 1.2s ease-in-out infinite" : "none",
                flexShrink: 0,
              }} />
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#555" }}>
                {isListening
                  ? "Grabando..."
                  : phase === "processing"
                  ? "Ana esta respondiendo..."
                  : isSpeaking
                  ? "Ana esta respondiendo..."
                  : phase === "ended"
                  ? "Entrevista finalizada"
                  : "Tu turno"}
              </span>
            </div>

            {/* Waveform — solo visible al grabar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 44,
              opacity: isListening ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}>
              {waveformBars.map((h, i) => (
                <div key={i} style={{
                  width: 3,
                  height: h,
                  backgroundColor: "#ffffff",
                  borderRadius: 2,
                  transition: "height 0.1s ease",
                }} />
              ))}
            </div>
          </>
        )}

        {/* Botón abrir editor — esquina inferior derecha */}
        {!showEditor && phase !== "ended" && (
          <button
            onClick={() => setShowEditor(true)}
            style={{
              position: "absolute", bottom: 20, right: 24,
              fontFamily: "monospace", fontSize: 11, color: "#333",
              background: "none", border: "1px solid #222", borderRadius: 6,
              padding: "4px 10px", cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#333"; e.currentTarget.style.borderColor = "#222"; }}
          >
            + codigo
          </button>
        )}
      </div>

      {/* ── Panel de transcripcion (slide-in desde la derecha) ── */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 360,
        backgroundColor: "#0f0f0f",
        borderLeft: "1px solid #222",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        transform: showTranscript ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease",
      }}>
        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 48,
          borderBottom: "1px solid #1a1a1a",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555" }}>transcripcion</span>
          <button
            onClick={() => setShowTranscript(false)}
            style={{ fontFamily: "monospace", fontSize: 13, color: "#444", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          >
            x
          </button>
        </div>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {historyDisplay.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#3f3f46" }}>
                {m.role === "user" ? "tu" : "ana"}
              </span>
              <span style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: m.role === "user" ? "#e4e4e7" : "#71717a",
                lineHeight: 1.6,
              }}>
                {m.content}
              </span>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Modal de confirmación de salida */}
      {pendingNavigation && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            backgroundColor: "#111111",
            border: "1px solid #222",
            borderRadius: 8,
            padding: 32,
            maxWidth: 400,
            width: "calc(100% - 48px)",
          }}>
            <p style={{ fontFamily: "Manuscribe, serif", fontSize: 20, color: "#fff", margin: 0 }}>
              ¿Abandonar la entrevista?
            </p>
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#555", marginTop: 8, lineHeight: 1.6 }}>
              Si sales ahora, la sesión se terminará y no podrás retomar.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                onClick={cancelLeave}
                style={{
                  backgroundColor: "#fff", color: "#000",
                  border: "none", borderRadius: 6,
                  fontSize: 13, padding: "10px 20px", cursor: "pointer",
                }}
              >
                Continuar entrevista
              </button>
              <button
                onClick={confirmLeave}
                style={{
                  backgroundColor: "transparent", color: "#555",
                  border: "1px solid #333", borderRadius: 6,
                  fontSize: 13, padding: "10px 20px", cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#aaa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS keyframes */}
      <style>{`
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.06); opacity: 0.2; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
