"use client";

import { useEffect, useRef } from "react";

// Lightweight canvas globe with continent-shaped dots
// No Three.js, no d3-geo — uses pre-defined land regions + seeded RNG

interface Props {
  size?: number;
  dotColor?: string;
  dotSize?: number;
  speed?: number;
  style?: React.CSSProperties;
}

// Seeded pseudo-random — same dots every render
function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

// [lat_min, lat_max, lon_min, lon_max, count]
// Covers all major continents with rough bounding rectangles
const LAND_REGIONS: [number, number, number, number, number][] = [
  // North America
  [49,  73, -140,  -60,  55],  // Canada
  [24,  49, -125,  -65,  65],  // USA
  [14,  30, -117,  -85,  22],  // Mexico / Central America
  [58,  84,  -58,  -18,  14],  // Greenland
  // South America
  [-5,  12,  -83,  -50,  22],  // Colombia / Venezuela
  [-56,  -5,  -76,  -35,  65], // Main body
  // Europe
  [36,  72,  -10,   35,  50],  // Western + Central Europe
  [55,  72,   15,   60,  18],  // Scandinavia extension
  [51,  60,  -11,    2,   8],  // UK / Ireland
  // Africa
  [-35,  37,  -18,   52, 105],
  // Middle East / Arabia
  [15,  38,   35,   62,  22],
  // South Asia
  [ 6,  36,   62,   97,  42],  // India / Pakistan / Sri Lanka
  // Southeast Asia mainland
  [ 0,  25,   97,  112,  18],  // Thailand / Indochina
  // East Asia
  [20,  55,  100,  145,  55],  // China / Korea / Japan
  [31,  45,  129,  146,  10],  // Japan islands
  // Russia / Central Asia
  [50,  75,   55,  180,  70],
  // Indonesia / Philippines
  [-10,   8,   95,  142,  28],
  // Australia
  [-43, -12,  113,  154,  40],
  // New Zealand
  [-47, -34,  165,  178,   6],
];

function buildLandDots(): [number, number, number][] {
  const r = rand(0xdeadbeef);
  const out: [number, number, number][] = [];

  for (const [latMin, latMax, lonMin, lonMax, count] of LAND_REGIONS) {
    for (let i = 0; i < count; i++) {
      const lat = latMin + r() * (latMax - latMin);
      const lon = lonMin + r() * (lonMax - lonMin);
      // Convert lat/lon (degrees) → 3D unit vector
      const phi  = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      out.push([x, y, z]);
    }
  }
  return out;
}

const LAND_DOTS = buildLandDots(); // computed once at module load

export function GlobeLite({
  size = 420,
  dotColor = "#ffffff",
  dotSize = 2,
  speed = 0.003,
  style,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width  = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    c.scale(dpr, dpr);

    const r = size / 2;
    let angle = 0;
    let alive = true;
    let raf = 0;

    // Pre-parse hex color once
    const hex = dotColor.replace("#", "");
    const dr = parseInt(hex.slice(0, 2), 16);
    const dg = parseInt(hex.slice(2, 4), 16);
    const db = parseInt(hex.slice(4, 6), 16);

    function draw() {
      c.clearRect(0, 0, size, size);

      // Faint sphere rim
      c.beginPath();
      c.arc(r, r, r - 2, 0, Math.PI * 2);
      c.strokeStyle = "rgba(255,255,255,0.04)";
      c.lineWidth = 1;
      c.stroke();

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      for (const [dx, dy, dz] of LAND_DOTS) {
        // Rotate around Y axis
        const rx =  dx * cosA + dz * sinA;
        const ry =  dy;
        const rz = -dx * sinA + dz * cosA;

        // Cull back-facing dots
        if (rz < 0) continue;

        // Orthographic projection
        const sx = r + rx * (r - 6);
        const sy = r - ry * (r - 6);

        // Depth → opacity: front=bright, edge=dim
        const alpha = 0.2 + rz * 0.8;

        c.beginPath();
        c.arc(sx, sy, dotSize, 0, Math.PI * 2);
        c.fillStyle = `rgba(${dr},${dg},${db},${alpha.toFixed(2)})`;
        c.fill();
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
  }, [size, dotColor, dotSize, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: "block", ...style }}
    />
  );
}
