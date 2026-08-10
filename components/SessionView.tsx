"use client";

import { useChannel } from "@portalsdk/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FeedbackScreen } from "./FeedbackScreen";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { useAudioPlayer } from "@/lib/useAudioPlayer";
import { useSilenceDetector } from "@/lib/useSilenceDetector";
import { useBreakpoint } from "@/lib/useIsMobile";

// Unlocks iOS audio engine — must be called from a direct user gesture (tap)
function unlockIOSAudio() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

function playEndTone(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
      osc.onended = () => { ctx.close(); resolve(); };
    } catch {
      resolve();
    }
  });
}

const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), { ssr: false });

type ChatContent = { text: string; role?: "user" | "interviewer" | "observer" };
type Phase = "idle" | "speaking" | "listening" | "processing" | "ended";
type HistoryEntry = { role: "user" | "interviewer"; content: string };

const CODE_KEYWORDS = /implementa|escribe|código|función|algorithm|implementarías|codifica|define la función|resuelve|query|SQL|componente/i;

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export function SessionView({ sessionId }: { sessionId: string }) {
  const channelId = `session-${sessionId}`;
  const { send, status } = useChannel<ChatContent>({ channelId });
  const { startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { speak, stop: stopAudio } = useAudioPlayer();
  const { startDetecting, stopDetecting } = useSilenceDetector();

  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [totalSeconds, setTotalSeconds] = useState(2700);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTextMode(params.get("mode") === "text");
    const dur = parseInt(params.get("duration") ?? "45", 10);
    setTotalSeconds((isNaN(dur) ? 45 : dur) * 60);
  }, []);

  // Guard: if this session was already completed, don't let it restart
  useEffect(() => {
    if (localStorage.getItem(`session-ended-${sessionId}`) === "true") {
      setAlreadyEnded(true);
    }
  }, [sessionId]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastInterviewerMsg, setLastInterviewerMsg] = useState("");
  const [msgKey, setMsgKey] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [codeValue, setCodeValue] = useState("// Escribe tu solución aquí\n");
  const [waveformBars, setWaveformBars] = useState<number[]>([4, 4, 4, 4, 4]);
  const [showFeedback, setShowFeedback] = useState(false);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const [audioUnlocked, setAudioUnlocked] = useState(!isMobile);
  const [remaining, setRemaining] = useState<number | null>(null);
  const warned5MinRef = useRef(false);
  const timeUpRef = useRef(false);
  const interviewAbortRef = useRef<AbortController | null>(null);

  const historyRef = useRef<HistoryEntry[]>([]);
  const [historyDisplay, setHistoryDisplay] = useState<HistoryEntry[]>([]);
  const router = useRouter();
  const startedRef = useRef(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [alreadyEnded, setAlreadyEnded] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  function appendHistory(entry: HistoryEntry) {
    historyRef.current = [...historyRef.current, entry];
    setHistoryDisplay(historyRef.current);
  }

  useEffect(() => {
    if (!sessionStarted || phase === "ended") return;
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);

      if (left <= 300 && !warned5MinRef.current) {
        warned5MinRef.current = true;
        const msg = "Oye, nos quedan unos 5 minutos. Vamos cerrando — ¿tienes alguna pregunta sobre el rol o el equipo?";
        send({ content: { text: msg, role: "interviewer" } });
        appendHistory({ role: "interviewer", content: msg });
        setLastInterviewerMsg(msg);
        setMsgKey((k) => k + 1);
        speak(msg, () => startListeningRef.current());
      }

      if (left === 0 && !timeUpRef.current) {
        timeUpRef.current = true;
        clearInterval(t);
        interviewAbortRef.current?.abort();
        stopAudio();
        stopDetecting();
        cancelRecording();
        localStorage.setItem(`session-ended-${sessionId}`, "true");
        playEndTone().then(() => {
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

  useEffect(() => {
    if (showTranscript) transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historyDisplay, showTranscript]);

  async function callInterviewer(message: string) {
    setPhase("processing");
    interviewAbortRef.current?.abort();
    const controller = new AbortController();
    interviewAbortRef.current = controller;
    try {
      const iRes = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historyRef.current.slice(0, -1),
          config: { type: "tecnica", level: "mid", language: "es" },
        }),
        signal: controller.signal,
      });
      const iData = await iRes.json();
      if (!iRes.ok || iData.error) {
        setError(iData.error ?? "Error del entrevistador");
        setPhase("idle");
        return;
      }
      const reply: string = iData.response;
      // Fix 2 — auto-open editor when reply contains code keywords
      if (iData.showEditor || CODE_KEYWORDS.test(reply)) {
        setShowEditor(true);
        if (iData.starterCode) setCodeValue(iData.starterCode);
      }
      await send({ content: { text: reply, role: "interviewer" } });
      appendHistory({ role: "interviewer", content: reply });
      setLastInterviewerMsg(reply);
      setMsgKey((k) => k + 1);
      setPhase("speaking");
      speak(reply, () => startListeningRef.current());
    } catch (err: any) {
      if (err?.name === "AbortError") return;
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

  startListeningRef.current = textMode ? () => setPhase("idle") : startListening;

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
    if (!audioUnlocked) return;
    startedRef.current = true;
    setSessionStarted(true);
    startInterview();
  }, [status, audioUnlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionStarted || phase === "ended") return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [sessionStarted, phase]);

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
    stopAudio();
    stopDetecting();
    cancelRecording();
    const dest = pendingNavigation;
    setPendingNavigation(null);
    setPhase("ended");
    if (dest) router.push(dest);
  }
  function cancelLeave() { setPendingNavigation(null); }
  function handleEnd() {
    interviewAbortRef.current?.abort();
    stopAudio();
    stopDetecting();
    cancelRecording();
    localStorage.setItem(`session-ended-${sessionId}`, "true");
    playEndTone().then(() => {
      setPhase("ended");
      setShowFeedback(true);
    });
  }

  const isSpeaking = phase === "speaking";
  const isListening = phase === "listening";

  if (alreadyEnded) return (
    <div style={{
      backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      <p style={{ fontFamily: "Manuscribe, serif", fontSize: 28, color: "#fff", margin: 0 }}>Poised</p>
      <p style={{ fontFamily: "monospace", fontSize: 13, color: "#555", margin: 0 }}>Esta sesión ya terminó.</p>
      <div style={{ display: "flex", gap: 16 }}>
        <button
          onClick={() => router.push("/historial")}
          style={{
            background: "none", border: "1px solid #333", borderRadius: 6,
            color: "#fff", fontFamily: "monospace", fontSize: 12,
            padding: "10px 20px", cursor: "pointer",
          }}
        >
          Ver historial
        </button>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none", border: "1px solid #333", borderRadius: 6,
            color: "#888", fontFamily: "monospace", fontSize: 12,
            padding: "10px 20px", cursor: "pointer",
          }}
        >
          Nueva entrevista
        </button>
      </div>
    </div>
  );

  if (showFeedback) return <FeedbackScreen history={historyRef.current} duration={totalSeconds} />;

  // iOS requires audio to be triggered from a direct user gesture.
  // Show a tap gate on mobile so we can unlock the audio engine before starting.
  if (isMobile && !audioUnlocked) {
    return (
      <div style={{
        backgroundColor: "#0a0a0a", minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24,
      }}>
        <p style={{ fontFamily: "Manuscribe, serif", fontSize: 28, color: "#fff" }}>Poised</p>
        <p style={{ fontFamily: "monospace", fontSize: 12, color: "#666", textAlign: "center", maxWidth: 260, lineHeight: 1.8 }}>
          Toca para comenzar la entrevista
        </p>
        <button
          onClick={() => {
            unlockIOSAudio();
            setAudioUnlocked(true);
          }}
          style={{
            fontFamily: "monospace", fontSize: 13, color: "#fff",
            background: "none", border: "1px solid #333", borderRadius: 6,
            padding: "14px 36px", cursor: "pointer",
          }}
        >
          Comenzar
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh" }} className="flex flex-col text-white overflow-hidden">

      {/* ── Header ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
        height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 24px",
        backgroundColor: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a",
      }}>
        <a href="/" style={{ fontFamily: "Manuscribe, serif", fontSize: 16, color: "#fff", textDecoration: "none" }}>
          Poised
        </a>
        {!isMobile && (
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}>
            Entrevista técnica · Mid
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 20 }}>
          <span style={{
            fontFamily: "monospace", fontSize: isMobile ? 12 : 13, fontWeight: 500,
            color: remaining !== null && remaining <= 300 ? "#ef4444" : "#fff",
            transition: "color 200ms",
          }}>
            {remaining !== null ? formatTime(remaining) : "--:--"}
          </span>
          {!isMobile && (
            <button
              onClick={() => setShowTranscript(true)}
              style={{
                fontFamily: "monospace", fontSize: 11, color: "#888",
                background: "none", border: "none", cursor: "pointer",
                transition: "color 200ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
            >
              Ver transcripcion
            </button>
          )}
          {!isMobile && (
            <a
              href="/historial"
              style={{
                fontFamily: "monospace", fontSize: 11, color: "#555",
                textDecoration: "none", transition: "color 200ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Historial
            </a>
          )}
          {phase !== "ended" && (
            <button
              onClick={handleEnd}
              style={{
                fontFamily: "monospace", fontSize: 11, color: "#666",
                background: "none", border: "none", cursor: "pointer",
                transition: "color 200ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
            >
              {isMobile ? "✕" : "Terminar"}
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setAppMenuOpen((o) => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 4 }}
            >
              {appMenuOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <line x1="1" y1="1" x2="15" y2="15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="15" y1="1" x2="1" y2="15" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <>
                  <span style={{ display: "block", height: 1.5, width: 16, backgroundColor: "#888", borderRadius: 1 }} />
                  <span style={{ display: "block", height: 1.5, width: 16, backgroundColor: "#888", borderRadius: 1 }} />
                  <span style={{ display: "block", height: 1.5, width: 16, backgroundColor: "#888", borderRadius: 1 }} />
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* ── App mobile menu ── */}
      {isMobile && appMenuOpen && (
        <>
          <div onClick={() => setAppMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 18 }} />
          <div style={{
            position: "fixed", top: 48, right: 0, zIndex: 19,
            backgroundColor: "#0f0f0f", borderLeft: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a",
            display: "flex", flexDirection: "column", minWidth: 180,
            animation: "slideDown 200ms ease",
          }}>
            <a
              href="#transcript"
              onClick={(e) => { e.preventDefault(); setAppMenuOpen(false); setShowTranscript(true); }}
              style={{ fontFamily: "monospace", fontSize: 13, color: "#aaa", textDecoration: "none", padding: "16px 20px", borderBottom: "1px solid #1a1a1a" }}
            >
              Ver transcripción
            </a>
            <a
              href="/historial"
              onClick={() => setAppMenuOpen(false)}
              style={{ fontFamily: "monospace", fontSize: 13, color: "#aaa", textDecoration: "none", padding: "16px 20px" }}
            >
              Historial
            </a>
          </div>
        </>
      )}

      {/* ── Zona superior: Entrevistador ── */}
      <div style={{
        flex: isMobile ? "0 0 50vh" : "0 0 60vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: isMobile ? 12 : 16, paddingTop: 48,
        backgroundColor: "#111111",
        backgroundImage: NOISE_BG, backgroundRepeat: "repeat", backgroundSize: "200px 200px",
        borderBottom: "1px solid #1a1a1a",
        position: "relative",
      }}>
        <div style={{ position: "relative", width: isMobile ? 80 : bp === "tablet" ? 100 : 120, height: isMobile ? 80 : bp === "tablet" ? 100 : 120 }}>
          {(isSpeaking || isListening) && (
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: `2px solid ${isSpeaking ? "#ffffff" : "#22c55e"}`,
              opacity: 0.5, animation: "ring-pulse 1.6s ease-in-out infinite",
            }} />
          )}
          <div style={{
            width: isMobile ? 80 : bp === "tablet" ? 100 : 120, height: isMobile ? 80 : bp === "tablet" ? 100 : 120, borderRadius: "50%",
            backgroundColor: "#1a1a1a", border: "1px solid #333",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "Manuscribe, serif", fontSize: isMobile ? 32 : bp === "tablet" ? 40 : 48, color: "#fff", lineHeight: 1, userSelect: "none" }}>
              A
            </span>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "Manuscribe, serif", fontSize: 20, color: "#fff", margin: 0 }}>Ana</p>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#555", margin: "4px 0 0" }}>
            Senior Engineer · Poised
          </p>
        </div>

        <div style={{ maxWidth: 480, textAlign: "center", minHeight: 44, padding: "0 24px" }}>
          {lastInterviewerMsg && (
            <p
              key={msgKey}
              style={{
                fontFamily: "monospace", fontSize: 13, color: "#888",
                lineHeight: 1.6, margin: 0,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
                animation: "fade-in 0.4s ease",
              }}
            >
              {lastInterviewerMsg}
            </p>
          )}
        </div>

        {error && (
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#f87171", position: "absolute", bottom: 16 }}>
            {error}
          </p>
        )}
      </div>

      {/* ── Zona inferior: Usuario ── */}
      <div style={{
        flex: isMobile ? "1 1 0" : "0 0 40vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: isMobile ? 16 : 24, backgroundColor: "#0a0a0a",
        padding: "0 24px", position: "relative",
      }}>

        {textMode && !showEditor ? (
          <div style={{ width: "100%", maxWidth: 560, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
              placeholder="Escribe tu respuesta..."
              disabled={phase === "processing" || phase === "speaking" || phase === "ended"}
              style={{
                flex: 1, backgroundColor: "#111", border: "1px solid #333",
                borderRadius: 6, color: "#fff", fontFamily: "monospace",
                fontSize: 13, padding: "8px 12px", outline: "none",
              }}
            />
            <button
              onClick={handleTextSubmit}
              disabled={phase === "processing" || phase === "speaking" || phase === "ended"}
              style={{
                fontFamily: "monospace", fontSize: 11, color: "#555",
                background: "none", border: "1px solid #333", borderRadius: 6,
                padding: "8px 12px", cursor: "pointer", flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#aaa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Enviar
            </button>
          </div>
        ) : showEditor ? (
          <div style={{
            width: "100%", maxWidth: 640,
            border: "1px solid #222",
            borderRadius: 8,
            backgroundColor: "#0d0d0d",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderBottom: "1px solid #1a1a1a",
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555" }}>
                // Escribe tu solucion
              </span>
              <button
                onClick={() => setShowEditor(false)}
                style={{
                  fontFamily: "monospace", fontSize: 11, color: "#555",
                  background: "none", border: "none", cursor: "pointer",
                  transition: "color 200ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
                cerrar
              </button>
            </div>
            <div style={{ height: 160 }}>
              <CodeEditor value={codeValue} onChange={setCodeValue} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor:
                  isListening ? "#ef4444" :
                  phase === "processing" || isSpeaking ? "#ffffff" : "#333",
                animation: (isListening || isSpeaking || phase === "processing")
                  ? "dot-pulse 1.2s ease-in-out infinite" : "none",
                flexShrink: 0,
              }} />
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#666" }}>
                {isListening ? "Grabando..."
                  : phase === "processing" || isSpeaking ? "Ana esta respondiendo..."
                  : phase === "ended" ? "Entrevista finalizada"
                  : "Tu turno"}
              </span>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 5, height: 44,
              opacity: isListening ? 1 : 0, transition: "opacity 0.3s ease",
            }}>
              {waveformBars.map((h, i) => (
                <div key={i} style={{
                  width: 3, height: h, backgroundColor: "#ffffff",
                  borderRadius: 2, transition: "height 0.1s ease",
                }} />
              ))}
            </div>
          </>
        )}

        {/* Fix 2 — Botón editor más visible */}
        {!showEditor && phase !== "ended" && (
          <button
            onClick={() => setShowEditor(true)}
            style={{
              position: "absolute", bottom: 20, right: 24,
              fontFamily: "monospace", fontSize: 11, color: "#888",
              background: "none", border: "1px solid #444", borderRadius: 6,
              padding: "6px 14px", cursor: "pointer", transition: "color 200ms, border-color 200ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#444"; }}
          >
            Editor de código
          </button>
        )}
      </div>

      {/* ── Panel de transcripcion ── */}
      {/* Mobile: overlay + drawer 85% from right */}
      {isMobile && showTranscript && (
        <div
          onClick={() => setShowTranscript(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 29,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        />
      )}
      <div style={{
        position: "fixed",
        right: 0,
        ...(isMobile
          ? { top: 0, bottom: 0, width: "85%", maxHeight: "100vh" }
          : { top: 0, bottom: 0, width: 360 }),
        backgroundColor: "#0f0f0f",
        borderLeft: "1px solid #222",
        zIndex: 30,
        display: "flex", flexDirection: "column",
        transform: showTranscript ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 48,
          borderBottom: "1px solid #1a1a1a", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#555" }}>Transcripción</span>
          <button
            onClick={() => setShowTranscript(false)}
            style={{
              fontFamily: "monospace", fontSize: 20, color: "#555",
              background: "none", border: "none", cursor: "pointer",
              lineHeight: 1, padding: "0 4px", transition: "color 200ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            ×
          </button>
        </div>
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px",
          display: "flex", flexDirection: "column",
          ...(isMobile ? { maxHeight: "calc(100vh - 48px)" } : {}),
        }}>
          {historyDisplay.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#555" }}>
                {m.role === "user" ? "tú" : "ana"}
              </span>
              <span style={{
                fontFamily: "monospace", fontSize: 11,
                color: m.role === "user" ? "#fff" : "#666",
                lineHeight: 1.7,
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
          backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            backgroundColor: "#111111", border: "1px solid #222",
            borderRadius: 8, padding: 32, maxWidth: 400, width: "calc(100% - 48px)",
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
                  backgroundColor: "#fff", color: "#000", border: "none",
                  borderRadius: 6, fontSize: 13, padding: "10px 20px", cursor: "pointer",
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
                  transition: "color 200ms",
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

      <style>{`
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.06); opacity: 0.2; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
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
