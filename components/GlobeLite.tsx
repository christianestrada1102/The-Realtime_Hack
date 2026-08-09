"use client";

import { useEffect, useRef } from "react";

// Lightweight dot-globe on 2D canvas — no Three.js, no d3-geo
// ~50 LOC vs 400 KB of JS bundles

interface Props {
  size?: number;
  dotColor?: string;
  dotSize?: number;
  dotDensity?: number;
  speed?: number;
  style?: React.CSSProperties;
}

export function GlobeLite({
  size = 450,
  dotColor = "#ffffff",
  dotSize = 1.8,
  dotDensity = 600,
  speed = 0.004,
  style,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    canvas.width = px;
    canvas.height = px;
    ctx.scale(dpr, dpr);

    const r = size / 2;
    let angle = 0;
    let alive = true;
    let raf = 0;

    // Pre-generate stable dot positions on the sphere
    const dots: [number, number][] = [];
    const PHI = Math.PI * (Math.sqrt(5) - 1); // golden angle
    for (let i = 0; i < dotDensity; i++) {
      const y = 1 - (i / (dotDensity - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = PHI * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      dots.push([x, y, z] as unknown as [number, number]);
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, size, size);

      // Faint sphere rim
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      for (const dot of dots as unknown as [number, number, number][]) {
        const [dx, dy, dz] = dot;
        // Rotate around Y axis
        const rx = dx * cosA + dz * sinA;
        const ry = dy;
        const rz = -dx * sinA + dz * cosA;

        // Only draw front-facing dots
        if (rz < -0.1) continue;

        // Simple orthographic projection
        const sx = r + rx * (r - 4);
        const sy = r - ry * (r - 4);

        // Depth-based opacity
        const alpha = 0.15 + (rz + 1) * 0.42;

        ctx.beginPath();
        ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = dotColor.startsWith("#")
          ? hexToRgba(dotColor, alpha)
          : dotColor;
        ctx.fill();
      }
    }

    function loop() {
      if (!alive) return;
      angle += speed;
      draw();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [size, dotColor, dotSize, dotDensity, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: "block", ...style }}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
