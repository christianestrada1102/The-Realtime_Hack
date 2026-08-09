'use client'
import { useEffect, useRef } from 'react'

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
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const CELL = 18

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cols = Math.ceil(canvas.width / CELL) + 1
      const rows = Math.ceil(canvas.height / CELL) + 1

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * CELL
          const y = j * CELL

          const wave1 = Math.sin(i * 0.4 + t * 1.2)
          const wave2 = Math.cos(j * 0.4 + t * 0.8)
          const wave3 = Math.sin((i + j) * 0.25 + t * 0.6)
          const combined = (wave1 + wave2 + wave3) / 3

          const radius = Math.max(0.3, ((combined + 1) / 2) * 3.5)

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,200,200,0.25)`
          ctx.fill()
        }
      }
      t += 0.015
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
        opacity: 0.5,
      }}
    />
  )
}
