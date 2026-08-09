"use client";

import Lenis from "@studio-freight/lenis";
import { useEffect } from "react";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let lenis: Lenis;
    let gsapTicker: ((time: number) => void) | null = null;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis();

      lenis.on("scroll", ScrollTrigger.update);

      gsapTicker = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(gsapTicker);
      gsap.ticker.lagSmoothing(0);
    })();

    return () => {
      (async () => {
        const { gsap } = await import("gsap");
        if (gsapTicker) gsap.ticker.remove(gsapTicker);
        lenis?.destroy();
      })();
    };
  }, []);

  return <>{children}</>;
}
