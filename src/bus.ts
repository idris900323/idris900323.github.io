// Tiny event bus so simulations can announce events (e.g. 'p2a') without importing Chaos code.
// Calm mode: nobody subscribes, so events are ignored. Chaos mode: the lazy Chaos chunk subscribes.
type Fn = (name: string) => void
const subs = new Set<Fn>()
export const emit = (name: string) => { subs.forEach((f) => f(name)) }
export const subscribe = (f: Fn) => { subs.add(f); return () => { subs.delete(f) } }
