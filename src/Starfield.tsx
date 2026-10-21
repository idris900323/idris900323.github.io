import { useEffect, useRef } from 'react'
import { useStore } from './store'
import { useReducedMotion } from './lib/hooks'

// Calm: a faint, static star dot-grid. Chaos: chunky cartoon stars that drift (paused for reduced motion).
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)
  const mode = useStore((s) => s.mode)
  const reduce = useReducedMotion()
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const chaos = mode === 'chaos'
    const animate = chaos && !reduce
    const n = chaos ? 90 : 70
    let w = 0, h = 0, raf = 0
    const stars = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, s: Math.random() * 0.0003 + 0.0001 }))
    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        if (animate) { s.y += s.s; if (s.y > 1) s.y = 0 }
        ctx.beginPath()
        ctx.fillStyle = chaos ? '#fff8' : '#f2f1ec2e'
        ctx.arc(s.x * w, s.y * h, chaos ? s.r * 2.2 : s.r, 0, 7)
        ctx.fill()
      }
    }
    const loop = () => { paint(); raf = requestAnimationFrame(loop) }
    const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight; paint() }
    resize()
    addEventListener('resize', resize)
    if (animate) raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize) }
  }, [mode, reduce])
  return <canvas ref={ref} className="stars" aria-hidden="true" />
}
