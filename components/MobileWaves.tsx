'use client'
import { useEffect, useRef } from 'react'

// Simplex-like noise via gradient hash — approximates the GLSL snoise used in ChromaticWaves
function hash(x: number, y: number): [number, number] {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  const t = Math.sin(x * 269.5 + y * 183.3) * 43758.5453
  return [s - Math.floor(s), t - Math.floor(t)]
}

function smoothstep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy

  const [a] = hash(ix,     iy    )
  const [b] = hash(ix + 1, iy    )
  const [c] = hash(ix,     iy + 1)
  const [d] = hash(ix + 1, iy + 1)

  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

// 3-octave fBm — mimics the Perlin noise field in the GLSL shader
function fbm(x: number, y: number): number {
  let v = 0
  let amp = 0.5
  let freq = 1
  for (let o = 0; o < 3; o++) {
    v += valueNoise2D(x * freq, y * freq) * amp
    freq *= 2.1
    amp  *= 0.5
  }
  return v // [0, ~1]
}

export default function MobileWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let t = 0

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Match ChromaticWaves mapped params: cellSize=20→16px, frequency=2→0.93, speed=3→0.15
    const CELL       = 16
    const FREQ       = 0.93
    const SPEED      = 0.15
    const GAMMA      = 2.47   // aplasta mid-tones, solo los picos crean puntos
    const BIAS       = -0.15  // recorta los puntos pequeños → efecto de ondas
    const MAX_RADIUS = CELL * 0.5

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cols = Math.ceil(canvas.width  / CELL) + 1
      const rows = Math.ceil(canvas.height / CELL) + 1
      const W = canvas.width  || 1
      const H = canvas.height || 1

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          // UV in [0,1] → scaled by frequency, Z = time * speed (matches GLSL)
          const ux = (i * CELL / W) * FREQ
          const uy = (j * CELL / H) * FREQ

          // Combine fBm with a time-shifted copy to fake the 3D snoise(vec3(uv, t))
          const n1 = fbm(ux + t * SPEED * 0.4, uy + t * SPEED * 0.3)
          const n2 = fbm(ux + 5.2 + t * SPEED * 0.3, uy + 1.3 + t * SPEED * 0.4)
          // Normalize blend to [0,1] — fBm output is ~[0, 0.875]
          let gray = Math.min(1, (n1 * 0.6 + n2 * 0.4) / 0.875)

          // Gamma crushes mid-tones: noise=0.5 → 0.174 (tiny dot), noise=0.9 → 0.77 (big dot)
          gray = Math.pow(Math.max(0.0001, gray), GAMMA)

          // Palette bias + radius mapping (matches dotFragmentShader radius calc)
          const r = Math.max(0, Math.min(1, gray + BIAS)) * MAX_RADIUS
          if (r < 0.3) continue

          ctx.beginPath()
          ctx.arc(i * CELL, j * CELL, r, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,1)'
          ctx.fill()
        }
      }

      t += 1 / 60  // ~60fps time increment
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.7,
      }}
    />
  )
}
