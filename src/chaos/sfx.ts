// Chaos-mode sound effects, synthesised with the Web Audio API (no audio files to download).
// Nothing plays until the visitor has interacted with the page, and the mute switch is remembered for the session.
let ctx: AudioContext | null = null
let muted = false
try { muted = sessionStorage.getItem('sfx-muted') === '1' } catch { /* ignore */ }

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  try { sessionStorage.setItem('sfx-muted', m ? '1' : '0') } catch { /* ignore */ }
}

function ac(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

const MASTER = 0.22

// One shared mixer: a compressor keeps many overlapping sounds from clipping, and a small synthetic room adds depth.
const buses = new WeakMap<AudioContext, GainNode>()
function bus(c: AudioContext): AudioNode {
  let b = buses.get(c)
  if (b) return b
  b = c.createGain()
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2
  b.connect(comp).connect(c.destination)
  const len = Math.floor(c.sampleRate * 0.7)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) }
  const conv = c.createConvolver(); conv.buffer = ir
  const wet = c.createGain(); wet.gain.value = 0.16
  b.connect(conv).connect(wet).connect(comp)
  buses.set(c, b)
  return b
}

function env(g: GainNode, t: number, peak: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak * MASTER, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

let jitter = 0.05 // pitch variation, so a sound used again and again never repeats exactly
function tone(c: AudioContext, type: OscillatorType, f0: number, f1: number, dur: number, peak = 1, delay = 0) {
  const v = 1 + (Math.random() - 0.5) * 2 * jitter
  f0 *= v; f1 *= v
  const t = c.currentTime + delay
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  env(g, t, peak, dur)
  o.connect(g).connect(bus(c))
  o.start(t); o.stop(t + dur + 0.02)
}

function noise(c: AudioContext, dur: number, f0: number, f1: number, peak = 1, delay = 0, type: BiquadFilterType = 'lowpass') {
  const t = c.currentTime + delay
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  src.buffer = buf
  f.type = type
  f.frequency.setValueAtTime(f0, t)
  f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur)
  env(g, t, peak, dur)
  src.connect(f).connect(g).connect(bus(c))
  src.start(t); src.stop(t + dur + 0.02)
}

/** A sustained brass-like chord: detuned sawtooth voices through a low-pass filter. */
function brass(c: AudioContext, freqs: number[], delay: number, dur: number, peak = 0.5) {
  const t = c.currentTime + delay
  const f = c.createBiquadFilter(), g = c.createGain()
  f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2600, t + 0.25); f.frequency.linearRampToValueAtTime(1200, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak * MASTER, t + 0.1)
  g.gain.setValueAtTime(peak * MASTER, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  f.connect(g).connect(bus(c))
  for (const hz of freqs) for (const d of [-6, 6]) {
    const o = c.createOscillator()
    o.type = 'sawtooth'; o.frequency.value = hz; o.detune.value = d
    o.connect(f); o.start(t); o.stop(t + dur + 0.05)
  }
}

function timpani(c: AudioContext, delay: number) {
  tone(c, 'sine', 120, 50, 0.45, 1.1, delay)
  noise(c, 0.2, 700, 90, 0.5, delay)
}

const RECIPES = {
  // a loud brass jumpscare sting: three hits and a held chord (original, not any entrance theme)
  cena: (c: AudioContext) => {
    brass(c, [392, 587], 0, 0.28, 0.9); timpani(c, 0)
    brass(c, [392, 587], 0.34, 0.28, 0.9); timpani(c, 0.34)
    brass(c, [392, 587], 0.68, 0.28, 0.9); timpani(c, 0.68)
    brass(c, [523, 784, 1046], 1.05, 1.8, 1); timpani(c, 1.05); noise(c, 0.5, 6000, 800, 0.9, 1.05, 'highpass')
  },
  // an original heroic fanfare (not any film theme): rising chords over timpani, about 9 seconds
  epic: (c: AudioContext) => {
    const G = [196, 294, 392], Eb = [155.6, 233, 311], F = [174.6, 261.6, 349.2], Bb = [233, 349, 466]
    const bars: [number[], number, number][] = [[G, 0, 1.3], [Eb, 1.4, 1.3], [F, 2.8, 1.3], [G, 4.2, 1.3], [Bb, 5.6, 1.2], [F, 6.9, 1.2], [G, 8.2, 3.2]]
    for (const [fr, at, len] of bars) { brass(c, fr, at, len); timpani(c, at) }
    brass(c, [98], 0, 11.4, 0.5)
  },
  chime: (c: AudioContext) => { [784, 988, 1319].forEach((fr, i) => tone(c, 'triangle', fr, fr, 0.5, 0.5, i * 0.09)); tone(c, 'sine', 2637, 2637, 0.6, 0.18, 0.2) },
  tick: (c: AudioContext) => tone(c, 'sine', 1900, 1500, 0.025, 0.12),
  swish: (c: AudioContext) => noise(c, 0.35, 700, 5200, 0.35, 0, 'bandpass'),
  pop: (c: AudioContext) => tone(c, 'sine', 700, 280, 0.09, 0.8),
  ding: (c: AudioContext) => { tone(c, 'triangle', 880, 880, 0.35, 0.7); tone(c, 'triangle', 1320, 1320, 0.5, 0.4, 0.08) },
  blip: (c: AudioContext) => tone(c, 'square', 520, 780, 0.07, 0.35),
  boing: (c: AudioContext) => { tone(c, 'sine', 260, 720, 0.12, 0.9); tone(c, 'sine', 720, 240, 0.22, 0.9, 0.11) },
  whoosh: (c: AudioContext) => noise(c, 0.9, 400, 4000, 0.7, 0, 'bandpass'),
  whistle: (c: AudioContext) => tone(c, 'sine', 1500, 160, 1.3, 0.6),
  boom: (c: AudioContext) => { noise(c, 1.2, 2200, 60, 1.4); tone(c, 'sine', 120, 28, 0.9, 1.4); noise(c, 0.35, 5000, 400, 0.8, 0, 'highpass') },
  thud: (c: AudioContext) => { tone(c, 'sine', 90, 35, 0.22, 1); noise(c, 0.12, 900, 120, 0.6) },
  rumble: (c: AudioContext) => noise(c, 1.6, 220, 40, 1),
  alarm: (c: AudioContext) => { for (let i = 0; i < 3; i++) { tone(c, 'square', 880, 880, 0.14, 0.5, i * 0.3); tone(c, 'square', 660, 660, 0.14, 0.5, i * 0.3 + 0.15) } },
  crack: (c: AudioContext) => { noise(c, 0.08, 6000, 1500, 0.9, 0, 'highpass'); noise(c, 0.1, 5000, 800, 0.7, 0.07, 'highpass'); noise(c, 0.12, 4000, 600, 0.6, 0.15, 'highpass') },
  warp: (c: AudioContext) => { tone(c, 'sawtooth', 1200, 120, 0.9, 0.5); tone(c, 'sawtooth', 120, 1200, 0.9, 0.4, 0.9) },
  sting: (c: AudioContext) => { tone(c, 'sawtooth', 110, 55, 1.4, 0.9); tone(c, 'square', 440, 330, 0.5, 0.5, 0.05); tone(c, 'square', 311, 233, 0.9, 0.5, 0.5) },
  nani: (c: AudioContext) => { tone(c, 'square', 1046, 1046, 0.12, 0.7); tone(c, 'square', 1568, 1568, 0.35, 0.7, 0.12) },
  fanfare: (c: AudioContext) => { [523, 659, 784, 1046].forEach((f, i) => tone(c, 'triangle', f, f, 0.28, 0.8, i * 0.14)) },
  restore: (c: AudioContext) => { [392, 523, 659].forEach((f, i) => tone(c, 'triangle', f, f, 0.2, 0.7, i * 0.09)) },
  error: (c: AudioContext) => { tone(c, 'sawtooth', 200, 110, 0.3, 0.6); tone(c, 'sawtooth', 160, 80, 0.4, 0.6, 0.18) },
  chomp: (c: AudioContext) => { noise(c, 0.07, 3000, 600, 0.8, 0, 'bandpass'); noise(c, 0.07, 3000, 600, 0.8, 0.1, 'bandpass') },
  shake: (c: AudioContext) => noise(c, 1.7, 180, 60, 0.9),
} as const

export type Sfx = keyof typeof RECIPES

export function sfx(name: Sfx) {
  const c = ac()
  if (c) RECIPES[name](c)
}

/** Robot anger: a beep that climbs with each click (level 1 to 14). */
export function angerBeep(level: number) {
  const c = ac()
  if (!c) return
  const f = 300 + level * 60
  tone(c, 'square', f, f * 1.25, 0.1, 0.5)
  if (level > 8) tone(c, 'sawtooth', f * 0.5, f * 0.4, 0.18, 0.5, 0.05)
}

/** A looping chiptune track for the warning crawl: drums, bass and an arpeggio over Am, F, C, G. Returns a stop function. */
export function startMusic(): () => void {
  const c = ac()
  if (!c) return () => {}
  const stepLen = 60 / 132 / 4
  jitter = 0
  const triads = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]]
  const roots = [110, 87.31, 130.81, 98]
  let next = c.currentTime + 0.08
  let n = 0
  let alive = true
  const play = (s: number, bar: number, delay: number) => {
    const tri = triads[bar]
    if (s % 4 === 0) tone(c, 'sine', 160, 42, 0.2, 1.1, delay) // kick
    if (s === 4 || s === 12) { noise(c, 0.13, 3200, 900, 0.55, delay, 'bandpass'); tone(c, 'triangle', 220, 150, 0.1, 0.4, delay) } // snare
    if (s % 2 === 0) noise(c, 0.04, 7000, 5000, s % 4 === 2 ? 0.35 : 0.2, delay, 'highpass') // hat
    if (s % 2 === 0) tone(c, 'square', s % 8 === 6 ? roots[bar] * 2 : roots[bar], s % 8 === 6 ? roots[bar] * 2 : roots[bar], 0.15, 0.4, delay) // bass
    const arp = [0, 1, 2, 1][s % 4]
    tone(c, 'triangle', tri[arp] * 2, tri[arp] * 2, 0.11, 0.38, delay) // arpeggio
    if (s === 0 || s === 8) tone(c, 'square', tri[2] * 4, tri[2] * 4, 0.2, 0.22, delay) // bright accent
  }
  const timer = window.setInterval(() => {
    if (!alive) return
    while (next < c.currentTime + 0.45) {
      play(n % 16, Math.floor(n / 16) % 4, Math.max(0, next - c.currentTime))
      next += stepLen
      n++
    }
  }, 100)
  return () => { alive = false; jitter = 0.05; clearInterval(timer) }
}

/** The long falling sound: wind that drops away (down) or climbs (up). */
/**
 * Construction site: hammering in quick runs, a drill every few seconds, a metal clang now and then, and a reversing truck beeping.
 * Used while the page is being "fixed" after the gravity gag. Returns a function that stops it.
 */
export function startConstruction(): () => void {
  const c = ac()
  if (!c) return () => {}
  let alive = true
  let nextHammer = 0, nextDrill = 1.5, nextBeep = 3, nextClang = 2.5
  const t0 = c.currentTime
  const timer = window.setInterval(() => {
    if (!alive) return
    const now = c.currentTime - t0
    const hammer = (d: number) => { noise(c, 0.05, 3200, 900, 0.8, d, 'bandpass'); tone(c, 'square', 190, 80, 0.07, 0.45, d) }
    if (now >= nextHammer) { // a run of 2 to 4 knocks
      const n = 2 + Math.floor(Math.random() * 3)
      for (let k = 0; k < n; k++) hammer(k * 0.24)
      nextHammer = now + n * 0.24 + 0.5 + Math.random() * 0.9
    }
    if (now >= nextDrill) { // buzzing drill
      for (let k = 0; k < 26; k++) { noise(c, 0.035, 2600, 1800, 0.5, k * 0.04, 'bandpass'); if (k % 2 === 0) tone(c, 'sawtooth', 150 + k * 2, 170 + k * 2, 0.04, 0.35, k * 0.04) }
      nextDrill = now + 4.5 + Math.random() * 3
    }
    if (now >= nextClang) { tone(c, 'triangle', 880, 640, 0.45, 0.5); tone(c, 'sine', 1320, 990, 0.35, 0.25); nextClang = now + 3.5 + Math.random() * 3 }
    if (now >= nextBeep) { for (let k = 0; k < 4; k++) tone(c, 'square', 1000, 1000, 0.2, 0.3, k * 0.5); nextBeep = now + 7 + Math.random() * 3 }
  }, 120)
  return () => { alive = false; clearInterval(timer) }
}

export function fall(dir: 1 | -1) {
  const c = ac()
  if (!c) return
  noise(c, 3.8, dir === 1 ? 3200 : 260, dir === 1 ? 220 : 3200, 0.9, 0, 'bandpass')
  tone(c, 'sine', dir === 1 ? 1500 : 180, dir === 1 ? 150 : 1500, 3.6, 0.45)
}

/** One thing hitting another: a clack, a clang or a thud between pieces, a heavy thump on the floor or ceiling. */
export function impact(level: number, wall: boolean) {
  const c = ac()
  if (!c) return
  const r = 0.8 + Math.random() * 0.5
  if (wall) {
    tone(c, 'sine', 120 * r, 34, 0.4, 0.7 + 0.7 * level)
    noise(c, 0.25, 900, 90, 0.55 + 0.4 * level)
    return
  }
  const pick = Math.random()
  if (pick < 0.5) { noise(c, 0.06, 2000 * r, 600, 0.3 + 0.5 * level, 0, 'bandpass'); tone(c, 'triangle', 430 * r, 260, 0.07, 0.3 + 0.3 * level) } // clack
  else if (pick < 0.8) { tone(c, 'sine', 200 * r, 70, 0.14, 0.45 + 0.5 * level); noise(c, 0.08, 700, 150, 0.3 * level) } // thud
  else { tone(c, 'square', 880 * r, 840 * r, 0.22, 0.18 + 0.25 * level); noise(c, 0.05, 6000, 2000, 0.25 * level, 0, 'highpass') } // clang
}
