// Gag scheduler (guide §22.8). Pure and testable: time is injected.
export type Tier = 'A' | 'B' | 'C' // ambient / interactive / set piece

export interface SchedulerOptions {
  maxConcurrent: number // default 3
  maxTierC: number // default 1 running at a time
  startQuietMs: number // nothing unprompted right after CHAOS is pressed (6 s)
  ambientGapMs: number // between unprompted ambient events (8 s)
  anyGapMs: number // between any two unprompted gags (20 s)
  defaultCooldownMs: number // 30 s
  capB: number // plays of the same tier-B gag per session
  capC: number // plays of a tier-C gag per session
}

export const DEFAULTS: SchedulerOptions = {
  maxConcurrent: 3, maxTierC: 1, startQuietMs: 6000, ambientGapMs: 8000, anyGapMs: 20000,
  defaultCooldownMs: 30000, capB: 3, capC: 1,
}

export type Request = { id: string; tier: Tier; prompted: boolean; cooldownMs?: number }

export class Scheduler {
  private opt: SchedulerOptions
  private startedAt: number
  private running = new Map<string, Tier>()
  private lastEnd = new Map<string, number>()
  private plays = new Map<string, number>()
  private lastUnprompted = -Infinity
  private lastAmbientUnprompted = -Infinity
  private dismissals = 0
  private restores = 0
  private reading = false
  calmer = false

  private now: () => number

  constructor(now: () => number, opt: Partial<SchedulerOptions> = {}) {
    this.now = now
    this.opt = { ...DEFAULTS, ...opt }
    this.startedAt = now()
  }

  /** Restart the quiet period (a new Chaos press) while keeping dismissal counts for the session. */
  markStart() { this.startedAt = this.now() }
  setReading(v: boolean) { this.reading = v }
  noteDismiss() { this.dismissals++; if (this.dismissals >= 3) this.calmer = true }
  noteRestore() { this.restores++; if (this.restores >= 2) this.calmer = true }
  noteLowFps() { this.calmer = true }
  playsOf(id: string) { return this.plays.get(id) ?? 0 }
  runningCount() { return this.running.size }

  /** Can this gag start now? */
  canRun(r: Request): boolean {
    const t = this.now()
    if (this.running.has(r.id)) return false
    if (this.running.size >= this.opt.maxConcurrent) return false
    if (r.tier === 'C') {
      let c = 0
      for (const tier of this.running.values()) if (tier === 'C') c++
      if (c >= this.opt.maxTierC) return false
    }
    const last = this.lastEnd.get(r.id)
    if (last !== undefined && t - last < (r.cooldownMs ?? this.opt.defaultCooldownMs)) return false
    const n = this.playsOf(r.id)
    if (r.tier === 'C' && n >= this.opt.capC) return false
    if (r.tier === 'B' && n >= this.opt.capB) return false
    if (!r.prompted) {
      if (r.tier === 'C') return false // set pieces never fire on their own
      if (t - this.startedAt < this.opt.startQuietMs) return false
      if (this.reading) return false
      if (t - this.lastUnprompted < this.opt.anyGapMs) return false
      if (r.tier === 'A' && t - this.lastAmbientUnprompted < this.opt.ambientGapMs) return false
      if (this.calmer && r.tier === 'B') return false
    }
    return true
  }

  start(r: Request): boolean {
    if (!this.canRun(r)) return false
    this.running.set(r.id, r.tier)
    this.plays.set(r.id, this.playsOf(r.id) + 1)
    if (!r.prompted) {
      this.lastUnprompted = this.now()
      if (r.tier === 'A') this.lastAmbientUnprompted = this.now()
    }
    return true
  }

  end(id: string) {
    if (this.running.delete(id)) this.lastEnd.set(id, this.now())
  }

  /** Visitor waved it away (click, Esc, scroll). */
  dismissAll() {
    for (const id of [...this.running.keys()]) this.end(id)
    this.noteDismiss()
  }

  /** Ambient density multiplier (guide: ~30% when calmer). */
  ambientDensity() { return this.calmer ? 0.3 : 1 }
}
