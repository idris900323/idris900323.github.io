import { useEffect, useRef, useState, type RefObject } from 'react'

export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setR(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return r
}

/** True while the element is within `margin` px of the viewport. */
export function useInView<T extends Element>(ref: RefObject<T | null>, margin = 200, threshold = 0): boolean {
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setV(true); return }
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: `${margin}px`, threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin, threshold])
  return v
}

/**
 * Fixed-timestep loop. `step(dt)` is called with dt seconds (fixed), `draw()` once per frame.
 * Pauses when `running` is false, the tab is hidden, or the host is off-screen (`active` false).
 */
export function useSimLoop(opts: { running: boolean; active: boolean; dt?: number; step: (dt: number) => void; draw: () => void }) {
  const ref = useRef(opts)
  useEffect(() => { ref.current = opts })
  useEffect(() => {
    if (!opts.running || !opts.active) return
    let raf = 0, last = performance.now(), acc = 0
    const loop = (now: number) => {
      const o = ref.current
      const dt = o.dt ?? 1 / 120
      acc += Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now
      let n = 0
      while (acc >= dt && n++ < 60) { o.step(dt); acc -= dt }
      if (acc >= dt) acc = 0 // drop the backlog instead of spiralling
      o.draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [opts.running, opts.active])
}
