"use client";

import { useEffect, useRef, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { useBreakpoint } from "@/lib/useIsMobile";
import { useLang } from "@/lib/LangContext";
import MobileWaves from "@/components/MobileWaves";
import dynamic from "next/dynamic";

const ChromaticWaves = dynamic(
  () => import("@/components/originkit/chromatic-waves"),
  { ssr: false, loading: () => null }
);

const Globe = dynamic(
  () => import("@/components/originkit/globe"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 200, height: 200, borderRadius: "50%",
          border: "1px solid #2a2a2a",
          animation: "globe-pulse 2s ease-in-out infinite",
        }} />
      </div>
    ),
  }
);

// memo prevents Three.js scene from re-mounting on parent re-renders
const GlobeMemo = memo(function GlobeMemo() {
  return (
    <Globe
      speed={1.5}
      scale={8}
      oceanColor="#0a0a0a"
      outlineColor="#2a2a2a"
      showOutline={true}
      showGrid={false}
      dots={{ color: "#ffffff", size: 2.5, density: 9, allDots: false }}
      style={{ width: "100%", height: "100%" }}
    />
  );
});

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];


// Paleta centralizada — un solo lugar para ajustar legibilidad
const C = {
  white:    "#ffffff",
  hi:       "#e4e4e4",   // texto importante secundario
  mid:      "#aaaaaa",   // texto descriptivo normal
  low:      "#777777",   // texto de apoyo
  dim:      "#555555",   // labels, meta
  xdim:     "#3a3a3a",   // fuentes, notas al pie
  border:   "#2a2a2a",
  borderLo: "#1e1e1e",
};

function LangToggle({ lang, toggle }: { lang: string; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", gap: 4, alignItems: "center" }}
    >
      <span style={{ fontFamily: "monospace", fontSize: 10, color: lang === "es" ? "#fff" : "#555", transition: "color 200ms" }}>ES</span>
      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#333" }}>|</span>
      <span style={{ fontFamily: "monospace", fontSize: 10, color: lang === "en" ? "#fff" : "#555", transition: "color 200ms" }}>EN</span>
    </button>
  );
}

function useInView(ref: React.RefObject<Element | null>, rootMargin = "200px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

export default function Home() {
  const router = useRouter();
  const { lang, t, toggle } = useLang();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const [duration, setDuration] = useState(45);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [navVisible, setNavVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);

  const heroSentinelRef = useRef<HTMLDivElement>(null);
  const globeSentinelRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroSentinelRef, "0px");
  const globeInView = useInView(globeSentinelRef, "400px");

  const heroTitleRef   = useRef<HTMLHeadingElement>(null);
  const heroSubRef     = useRef<HTMLParagraphElement>(null);
  const heroVersionRef = useRef<HTMLParagraphElement>(null);
  const heroBtnRef     = useRef<HTMLButtonElement>(null);
  const heroScrollRef  = useRef<HTMLDivElement>(null);
  const problemLine1Ref = useRef<HTMLParagraphElement>(null);
  const problemLine2Ref = useRef<HTMLParagraphElement>(null);
  const problemLine3Ref = useRef<HTMLParagraphElement>(null);
  const problemColsRef  = useRef<HTMLDivElement>(null);
  const howSectionRef   = useRef<HTMLDivElement>(null);
  const archSectionRef  = useRef<HTMLDivElement>(null);
  const globeSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | null = null;

    const initGsap = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { ScrollToPlugin } = await import("gsap/ScrollToPlugin");
      gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

      // Preload Globe chunk in background so it's ready when user scrolls to it
      import("@/components/originkit/globe").catch(() => {});

      gsap.fromTo("body", { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" });

      ctx = gsap.context(() => {
        if (heroTitleRef.current) {
          const text = heroTitleRef.current.textContent ?? "";
          heroTitleRef.current.innerHTML = text
            .split("")
            .map((ch) => ch === " " ? " " : `<span style="display:inline-block;opacity:0;transform:translateY(20px)">${ch}</span>`)
            .join("");
          gsap.to(heroTitleRef.current.querySelectorAll("span"), {
            opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "power2.out", delay: 0.2,
          });
        }

        gsap.fromTo(heroSubRef.current,     { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.65,  ease: "power2.out" });
        gsap.fromTo(heroVersionRef.current, { opacity: 0 },        { opacity: 1,       duration: 0.4, delay: 0.9,   ease: "power2.out" });
        gsap.fromTo(heroBtnRef.current,     { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, delay: 1.05,  ease: "power2.out" });
        gsap.fromTo(heroScrollRef.current,  { opacity: 0 },        { opacity: 1,       duration: 0.4, delay: 1.4 });

        [problemLine1Ref, problemLine2Ref, problemLine3Ref].forEach((ref, i) => {
          if (!ref.current) return;
          gsap.fromTo(ref.current, { opacity: 0, y: 20 }, {
            opacity: 1, y: 0, duration: 0.6, delay: i * 0.18, ease: "power2.out",
            scrollTrigger: { trigger: ref.current, start: "top 82%" },
          });
        });

        if (problemColsRef.current) {
          gsap.fromTo(Array.from(problemColsRef.current.children), { opacity: 0, y: 12 }, {
            opacity: 1, y: 0, duration: 0.4, stagger: 0.12, ease: "power2.out",
            scrollTrigger: { trigger: problemColsRef.current, start: "top 82%" },
          });
        }

        if (howSectionRef.current) {
          gsap.fromTo(Array.from(howSectionRef.current.querySelectorAll(".how-col")), { opacity: 0, y: 16 }, {
            opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: "power2.out",
            scrollTrigger: { trigger: howSectionRef.current, start: "top 80%" },
          });
        }

        if (archSectionRef.current) {
          gsap.fromTo(archSectionRef.current, { opacity: 0, y: 20 }, {
            opacity: 1, y: 0, duration: 0.6, ease: "power2.out",
            scrollTrigger: { trigger: archSectionRef.current, start: "top 80%" },
          });
        }

        if (globeSectionRef.current) {
          gsap.fromTo(globeSectionRef.current, { opacity: 0 }, {
            opacity: 1, duration: 0.7, ease: "power2.out",
            scrollTrigger: { trigger: globeSectionRef.current, start: "top 78%" },
          });
        }
      });
    };

    const useIdle = typeof requestIdleCallback !== "undefined";
    const id = useIdle ? requestIdleCallback(initGsap) : setTimeout(initGsap, 100);
    return () => {
      if (useIdle) cancelIdleCallback(id as number);
      else clearTimeout(id as ReturnType<typeof setTimeout>);
      ctx?.revert();
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      });
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // GSAP smooth scroll — faster and smoother than browser scroll-behavior: smooth
  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href?.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const { gsap } = await import("gsap");
      const { ScrollToPlugin } = await import("gsap/ScrollToPlugin");
      gsap.registerPlugin(ScrollToPlugin);
      gsap.to(window, {
        duration: 0.75,
        scrollTo: { y: target, offsetY: 52 },
        ease: "power3.inOut",
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const onScroll = () => setNavVisible(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver para sección activa en navbar
  useEffect(() => {
    const ids = ["problema", "como", "arch"];
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { gsap } = await import("gsap");
      gsap.to(loadingRef.current, {
        opacity: 0, duration: 0.8, ease: "power2.out",
        onComplete: () => setLoadingVisible(false),
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  function handleStart() {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    router.push(`/session/${id}?duration=${duration}`);
  }

  return (
    <>
      {/* ── Loading screen ── */}
      {loadingVisible && (
        <div
          ref={loadingRef}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            backgroundColor: "#0a0a0a",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 16,
          }}
        >
          <span style={{ fontFamily: "Manuscribe, serif", fontSize: 36, color: C.white }}>
            Poised
          </span>
          <div style={{ width: 120, height: 1, backgroundColor: "#1a1a1a", overflow: "hidden" }}>
            <div style={{ height: "100%", backgroundColor: C.white, animation: "progress-fill 2s linear forwards" }} />
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 20px" : "0 40px", height: 52,
        backgroundColor: "rgba(10,10,10,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        opacity: navVisible ? 1 : 0,
        pointerEvents: navVisible ? "auto" : "none",
        transform: navVisible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}>
        <span style={{ fontFamily: "Manuscribe, serif", fontSize: 18, color: C.white }}>
          Poised
        </span>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {[
              { label: t.navProblem, href: "#problema", id: "problema" },
              { label: t.navHow,     href: "#como",     id: "como" },
              { label: t.navArch,    href: "#arch",     id: "arch" },
            ].map(({ label, href, id }) => {
              const isActive = activeSection === id;
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    fontFamily: "monospace", fontSize: 11,
                    color: isActive ? C.white : C.low,
                    textDecoration: "none", transition: "color 0.2s",
                    display: "flex", flexDirection: "column", gap: 3,
                    paddingBottom: 2,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? C.white : C.low)}
                >
                  {label}
                  <span style={{
                    display: "block", height: 1, backgroundColor: C.white,
                    width: isActive ? "100%" : "0%",
                    transition: "width 300ms ease-out",
                  }} />
                </a>
              );
            })}
          </div>
        )}

        {/* Desktop CTA / Mobile: CTA + hamburger */}
        {isMobile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LangToggle lang={lang} toggle={toggle} />
            <button
              onClick={() => setModalOpen(true)}
              style={{
                background: "none", border: "1px solid #333", borderRadius: 4,
                color: C.white, fontFamily: "monospace", fontSize: 11,
                padding: "7px 16px", cursor: "pointer",
                transition: "background 200ms, color 200ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.white; }}
            >
              {t.startButton.split(" ")[0]}
            </button>
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", justifyContent: "center",
                gap: 5, padding: 4, width: 28, height: 28,
              }}
            >
              {mobileMenuOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <line x1="1" y1="1" x2="17" y2="17" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="17" y1="1" x2="1" y2="17" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <>
                  <span style={{ display: "block", height: 1.5, width: 18, backgroundColor: C.white, borderRadius: 1 }} />
                  <span style={{ display: "block", height: 1.5, width: 18, backgroundColor: C.white, borderRadius: 1 }} />
                  <span style={{ display: "block", height: 1.5, width: 18, backgroundColor: C.white, borderRadius: 1 }} />
                </>
              )}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LangToggle lang={lang} toggle={toggle} />
            <button
              onClick={() => setModalOpen(true)}
              style={{
                background: "none", border: "1px solid #333", borderRadius: 4,
                color: C.white, fontFamily: "monospace", fontSize: 11,
                padding: "8px 20px", cursor: "pointer",
                transition: "background 300ms ease, color 300ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.white;
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = C.white;
              }}
            >
              {t.startButton}
            </button>
          </div>
        )}
      </nav>

      {/* ── Mobile dropdown menu ── */}
      {isMobile && mobileMenuOpen && (
        <>
          {/* Overlay to close */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 48 }}
          />
          <div style={{
            position: "fixed", top: 52, left: 0, right: 0, zIndex: 49,
            backgroundColor: "#0f0f0f",
            borderBottom: "1px solid #1a1a1a",
            display: "flex", flexDirection: "column",
            animation: "slideDown 200ms ease",
            overflow: "hidden",
          }}>
            {[
              { label: t.navProblem, href: "#problema" },
              { label: t.navHow,     href: "#como" },
              { label: t.navArch,    href: "#arch" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontFamily: "monospace", fontSize: 13, color: C.mid,
                  textDecoration: "none", padding: "18px 24px",
                  borderBottom: "1px solid #1a1a1a",
                  transition: "color 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.mid)}
              >
                {label}
              </a>
            ))}
          </div>
        </>
      )}

      <main style={{ backgroundColor: "#0a0a0a", color: C.white, opacity: loadingVisible ? 0 : 1, transition: "opacity 0.3s ease" }}>

        {/* ── Hero ── */}
        <section style={{
          position: "relative", height: "100vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", overflow: "hidden",
        }}>
          <div ref={heroSentinelRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {isMobile ? (
              <MobileWaves />
            ) : heroInView && (
              <div style={{ position: "absolute", inset: 0, opacity: 0.15, overflow: "hidden" }}>
                <ChromaticWaves frequency={2} speed={3} bgColor="#0a0a0a" colors={["#ffffff"]} cellSize={20} />
              </div>
            )}
          </div>

          <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <h1
              ref={heroTitleRef}
              style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(48px, 10vw, 96px)", color: C.white, margin: 0, lineHeight: 1 }}
            >
              Poised
            </h1>

            <p ref={heroSubRef} style={{ fontFamily: "monospace", fontSize: 13, color: C.mid, margin: 0, opacity: 0 }}>
              {t.tagline}
            </p>

            <p ref={heroVersionRef} style={{ fontFamily: "monospace", fontSize: 11, color: C.dim, margin: 0, opacity: 0 }}>
              {t.version}
            </p>

            <button
              ref={heroBtnRef}
              onClick={(e) => {
                const btn = e.currentTarget;
                btn.style.transform = "scale(0.97)";
                setModalOpen(true);
                setTimeout(() => { btn.style.transform = "scale(1)"; }, 100);
              }}
              style={{
                background: "none", border: "1px solid #333", borderRadius: 4,
                color: C.white, fontFamily: "Manuscribe, serif", fontSize: 20,
                padding: "16px 48px", cursor: "pointer", opacity: 0, marginTop: 8,
                transition: "background 400ms ease, color 400ms ease, border-color 400ms ease, transform 100ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.white;
                e.currentTarget.style.color = "#000";
                e.currentTarget.style.borderColor = C.white;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = C.white;
                e.currentTarget.style.borderColor = "#333";
              }}
            >
              {t.startButton}
            </button>
          </div>

          <div ref={heroScrollRef} style={{
            position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0,
          }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: C.dim }}>{t.scroll}</span>
            <div style={{ width: 1, height: 40, backgroundColor: C.dim, animation: "scroll-line 1.6s ease-in-out infinite" }} />
          </div>
        </section>

        {/* ── El problema ── */}
        <section id="problema" style={{
          height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 24px", gap: 48,
        }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
            <p ref={problemLine1Ref} style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(28px, 6vw, 52px)", color: C.white, margin: 0, opacity: 0 }}>
              {t.problemLine1}
            </p>
            <p ref={problemLine2Ref} style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(28px, 6vw, 52px)", color: C.low, margin: 0, opacity: 0 }}>
              {t.problemLine2}
            </p>
            <p ref={problemLine3Ref} style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(28px, 6vw, 52px)", color: C.white, margin: 0, opacity: 0, marginTop: 16 }}>
              {t.poisedSi}
            </p>
          </div>

          <div ref={problemColsRef} style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",  // tablet & desktop: 3 cols
            gap: 0, maxWidth: 560, width: "100%",
          }}>
            {[t.colFeature1, t.colFeature2, t.colFeature3].map((label, i, arr) => (
              <div key={label} style={{
                borderTop: `1px solid ${C.border}`,
                borderBottom: isMobile && i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                padding: isMobile ? "16px 0" : "16px 0 0",
                textAlign: isMobile ? "center" : "left",
              }}>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: C.mid }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Globe + Stats ── */}
        <section ref={globeSectionRef} style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center", justifyContent: "center",
          padding: isMobile ? "60px 24px" : "80px 24px",
          gap: isMobile ? 40 : isTablet ? 48 : 64, opacity: 0,
          borderTop: `1px solid ${C.borderLo}`,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32, width: isMobile ? "100%" : undefined, maxWidth: 280, textAlign: isMobile ? "center" : "left" }}>
            <span style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(22px, 3vw, 28px)", color: C.white }}>{t.problemReal}</span>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {t.stats.map(({ num, label }) => (
                <div key={num} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontFamily: "Manuscribe, serif", fontSize: isMobile ? 32 : 40, color: C.white, lineHeight: 1 }}>{num}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: C.mid, lineHeight: 1.6 }}>{label}</span>
                </div>
              ))}
            </div>

            <span style={{ fontFamily: "monospace", fontSize: 10, color: C.xdim, lineHeight: 1.5 }}>
              {t.statsSource}
            </span>
          </div>

          <div
            ref={globeSentinelRef}
            style={{
              width: isMobile ? 280 : isTablet ? 350 : 450,
              height: isMobile ? 280 : isTablet ? 350 : 450,
              flexShrink: 0,
              margin: isMobile ? "0 auto" : undefined,
            }}
          >
            {globeInView && <GlobeMemo />}
          </div>
        </section>

        {/* ── Cómo funciona + Lo que te llevás ── */}
        <section id="como" style={{
          padding: isMobile ? "64px 24px 80px" : "80px 40px 100px",
          borderTop: `1px solid ${C.borderLo}`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 64,
        }}>

          {/* Pasos */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48, width: "100%" }}>
            <h2 style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(24px, 4vw, 32px)", color: C.white, margin: 0 }}>
              {t.howTitle}
            </h2>
            <div
              ref={howSectionRef}
              style={isMobile
                ? { display: "flex", flexDirection: "column", width: "100%", maxWidth: 400 }
                : { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, maxWidth: 760, width: "100%" }
              }
            >
              {(isMobile
                ? [t.howSteps[0], t.howSteps[2], t.howSteps[1]]
                : t.howSteps
              ).map((item, i, arr) => (
                <div
                  key={item.title}
                  className="how-col"
                  style={isMobile ? {
                    borderBottom: i < arr.length - 1 ? `1px solid #1a1a1a` : "none",
                    padding: "24px 0",
                    display: "flex", flexDirection: "column", gap: 10, opacity: 0,
                    alignItems: "center", textAlign: "center",
                  } : {
                    borderTop: `1px solid ${C.border}`,
                    borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                    padding: "24px 32px 24px 0",
                    paddingLeft: i === 0 ? 0 : 32,
                    display: "flex", flexDirection: "column", gap: 10, opacity: 0,
                  }}
                >
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: C.dim }}>{item.step}</span>
                  <p style={{ fontFamily: "monospace", fontSize: 13, color: C.hi, margin: 0 }}>{item.title}</p>
                  <p style={{ fontFamily: "monospace", fontSize: 12, color: C.mid, margin: 0, lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Divisor */}
          <div style={{ width: "100%", maxWidth: 860, height: 1, backgroundColor: C.borderLo }} />

          {/* Lo que te llevás */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48, width: "100%" }}>
            <h2 style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(24px, 4vw, 32px)", color: C.white, margin: 0 }}>
              {t.takesTitle}
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 16, maxWidth: 860, width: "100%",
            }}>
              {t.takes.map(({ title, stat, desc }) => (
                <div
                  key={title}
                  style={{
                    background: "#0f0f0f", border: "1px solid #1a1a1a",
                    borderRadius: 4, padding: 24,
                    display: "flex", flexDirection: "column", gap: 16,
                    transition: "border-color 200ms", cursor: "default",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#333")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a1a1a")}
                >
                  <span style={{ fontFamily: "Manuscribe, serif", fontSize: 28, color: C.white, lineHeight: 1 }}>{stat}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontFamily: "monospace", fontSize: 12, color: C.hi, margin: 0 }}>{title}</p>
                    <p style={{ fontFamily: "monospace", fontSize: 11, color: C.mid, margin: 0, lineHeight: 1.7 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Arquitectura en tiempo real ── */}
        <section id="arch" ref={archSectionRef} style={{
          padding: "100px 24px", borderTop: `1px solid ${C.borderLo}`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 60, opacity: 0,
        }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontFamily: "Manuscribe, serif", fontSize: "clamp(24px, 4vw, 36px)", color: C.white, margin: 0 }}>
              {t.archTitle}
            </h2>
            <p style={{ fontFamily: "monospace", fontSize: 12, color: C.mid, margin: 0 }}>
              {t.archSub}
            </p>
          </div>

          <div style={{ maxWidth: 800, width: "100%", margin: "0 auto" }}>
            {isMobile ? (
              /* Mobile: vertical stack Tú → Canal Portal → Ana | Observador */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                {/* Nodo: Tú */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 9, color: C.low }}>mic</span>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: C.mid }}>Tú</span>
                </div>
                {/* Arrow down */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "6px 0" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: C.dim }}>Whisper</span>
                  <div style={{ width: 1, height: 20, backgroundColor: C.border }} />
                  <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `6px solid ${C.dim}` }} />
                </div>
                {/* Nodo: Canal Portal */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.white}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "portal-pulse 2.4s ease-in-out infinite" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 9, color: C.mid }}>⬤</span>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: C.white }}>Canal Portal</span>
                </div>
                {/* Arrow down */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "6px 0" }}>
                  <div style={{ width: 1, height: 20, backgroundColor: C.border }} />
                  <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `6px solid ${C.dim}` }} />
                </div>
                {/* Fila: Ana | Observador */}
                <div style={{ display: "flex", gap: 32 }}>
                  {[
                    { id: "ana", label: "Ana" },
                    { id: "obs", label: "Observador" },
                  ].map(({ id, label }) => (
                    <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 9, color: C.low }}>{id}</span>
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: C.mid }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Fila superior: Tú → Canal Portal */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* Nodo: Tú */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: C.low }}>mic</span>
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: C.mid }}>Tú</span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: C.low, textAlign: "center", maxWidth: 80 }}>
                      Hablas por micrófono
                    </span>
                  </div>

                  {/* Conector */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 160, padding: "0 8px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: C.dim, marginBottom: 4, whiteSpace: "nowrap" }}>
                      Whisper transcribe
                    </span>
                    <div style={{ width: "100%", display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                      <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: `6px solid ${C.dim}` }} />
                    </div>
                  </div>

                  {/* Nodo: Canal Portal */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", border: `1px solid ${C.white}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      animation: "portal-pulse 2.4s ease-in-out infinite",
                    }}>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: C.mid }}>⬤</span>
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: C.white }}>Canal Portal</span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: C.low, textAlign: "center", maxWidth: 100 }}>
                      Estado compartido en tiempo real
                    </span>
                  </div>
                </div>

                {/* Línea vertical central */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 1, height: 40, backgroundColor: C.border }} />
                </div>

                {/* Fila inferior: Ana | Observador */}
                <div style={{ display: "flex", justifyContent: "center", gap: 64, flexWrap: "wrap" }}>
                  {[
                    { id: "ana", label: "Ana",        role: "Entrevistadora principal",  note: "Responde, presiona, cambia de tema" },
                    { id: "obs", label: "Observador", role: "Segunda IA silenciosa",     note: "Detecta silencios, interrumpe cuando bajas la guardia" },
                  ].map(({ id, label, role, note }) => (
                    <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 1, height: 24, backgroundColor: C.border }} />
                      <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `6px solid ${C.dim}` }} />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, color: C.low }}>{id}</span>
                        </div>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: C.mid }}>{label}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: C.low, textAlign: "center", maxWidth: 120 }}>{role}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: C.dim, textAlign: "center", maxWidth: 160 }}>{note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Columnas explicativas */}
          <div style={{ maxWidth: 800, width: "100%", margin: "0 auto", borderTop: `1px solid ${C.borderLo}`, paddingTop: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: isMobile ? 24 : 32 }}>
              {t.archCols.map(({ title, body }) => (
                <div key={title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontFamily: "monospace", fontSize: 13, color: C.hi, margin: 0 }}>{title}</p>
                  <p style={{ fontFamily: "monospace", fontSize: 12, color: C.mid, margin: 0, lineHeight: 1.8 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: "1px solid #1a1a1a",
          padding: isMobile ? "24px 20px" : "24px 40px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: isMobile ? "center" : "space-between",
          alignItems: "center",
          gap: isMobile ? 8 : 0,
          backgroundColor: "#0a0a0a",
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#666" }}>
            © 2026{" "}
            <a
              href="https://www.codebynas.dev/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#aaa", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
            >
              Christian Estrada
            </a>
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#666" }}>
            <span style={{ fontFamily: "Manuscribe, serif", color: "#fff" }}>Poised</span>
            {` · ${t.footerHack}`}
          </span>
        </footer>

        <style>{`
          @keyframes modal-bg-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes modal-in {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes drift {
            0%, 100% { background-position: 0 0; }
            50% { background-position: 12px 12px; }
          }
          @keyframes scroll-line {
            0%   { transform: scaleY(0); transform-origin: top; }
            50%  { transform: scaleY(1); transform-origin: top; }
            51%  { transform: scaleY(1); transform-origin: bottom; }
            100% { transform: scaleY(0); transform-origin: bottom; }
          }
          @keyframes progress-fill {
            from { width: 0%; }
            to   { width: 100%; }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes portal-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
            50%       { box-shadow: 0 0 0 6px rgba(255,255,255,0.08); }
          }
          @keyframes globe-pulse {
            0%, 100% { opacity: 0.06; transform: scale(1); }
            50%       { opacity: 0.12; transform: scale(1.03); }
          }
        `}</style>
      </main>

      {/* ── Modal Config ── */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            animation: "modal-bg-in 0.15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#111", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: isMobile ? 28 : 40,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
              position: "relative", minWidth: isMobile ? "calc(100vw - 48px)" : 300,
              animation: "modal-in 0.15s ease",
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute", top: 16, right: 16,
                background: "none", border: "none", color: C.low,
                fontFamily: "monospace", fontSize: 16, cursor: "pointer",
                lineHeight: 1, padding: 4, transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.low)}
            >
              ✕
            </button>

            <p style={{ fontFamily: "monospace", fontSize: 12, color: C.mid, margin: 0 }}>
              {t.configTitle}
            </p>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <p style={{ fontFamily: "monospace", fontSize: 11, color: C.low, margin: 0 }}>{t.duration}</p>
              <div style={{ display: "flex", gap: 8 }}>
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    style={{
                      background: "none",
                      border: `1px solid ${duration === d.value ? C.white : C.border}`,
                      borderRadius: 6,
                      color: duration === d.value ? C.white : C.mid,
                      fontFamily: "monospace", fontSize: 13,
                      padding: "8px 18px", cursor: "pointer",
                      transition: "border-color 0.15s, color 0.15s",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              style={{
                background: C.white, border: "none", borderRadius: 6,
                color: "#000", fontFamily: "monospace", fontSize: 14,
                padding: "12px 32px", cursor: "pointer", width: "100%",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e4e4e7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
            >
              {t.startSession}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
