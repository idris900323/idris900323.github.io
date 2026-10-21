import { lazy, type ComponentType } from 'react'
import { emit } from '../bus'
import { useStore } from '../store'
import type { SimKey } from '../content'

// Every sim is a lazy chunk, mounted only when its section nears the viewport (see SimSlot).
const Pid = lazy(() => import('./pid/View'))
const Cpu8 = lazy(() => import('./cpu8/View'))
const Pipe = lazy(() => import('./pipe/View'))
const Swarm = lazy(() => import('./swarm/View'))
const Gait = lazy(() => import('./gait/View'))
const Arena = lazy(() => import('./arena/View'))
const GaitSignal = lazy(() => import('./gaitsignal/View'))
const Net = lazy(() => import('./net/View'))

type P = { lang: 'en' | 'ja' }

// Simulation events become Chaos captions through the bus (ignored in Calm mode).
const cpuEvt = (e: string) => { if (e === 'overflow') emit('p2a'); else if (e === 'illegal') emit('p2b'); else if (e === 'halt') emit('p2c') }
const swarmEvt = (e: string) => { if (e === 'boss-add') emit('p6a'); else if (e === 'boss-remove') emit('p6b') }
const gaitEvt = (e: string) => { if (e === 'chaos-gait' || e === 'tangle') emit('p3') }
const netEvt = (e: string) => { if (e === 'net-closed') emit('p9a'); else if (e === 'node-failed') emit('p9b') }
const pidEvt = (e: string) => { if (['p8a', 'p8b', 'p8c', 'p8d', 'p8e'].includes(e)) emit(e) }
const pipeEvt = (e: string) => { if (e === 'leak-found') emit('p5') }

function ArenaSim(p: P) {
  const chaos = useStore((s) => s.mode === 'chaos')
  return <Arena {...p} pairingFailures={chaos ? 3 : 0} />
}

export const SimView: Record<SimKey, ComponentType<P>> = {
  pid: (p) => <Pid {...p} {...({ onEvent: pidEvt } as object)} />,
  cpu8: (p) => <Cpu8 {...p} onEvent={cpuEvt} />,
  pipe: (p) => <Pipe {...p} {...({ onEvent: pipeEvt } as object)} />,
  swarm: (p) => <Swarm {...p} onEvent={swarmEvt} />,
  gait: (p) => <Gait {...p} onEvent={gaitEvt} />,
  arena: ArenaSim,
  gaitsignal: (p) => <GaitSignal {...p} />,
  net: (p) => <Net {...p} {...({ onEvent: netEvt } as object)} />,
}
