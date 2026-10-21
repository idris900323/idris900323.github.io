/// <reference lib="webworker" />
import { autoTune, type Plant } from './core'

export type TunerRequest = { id: number; plant: Plant; seed: number }
export type TunerResponse = { id: number; gains: { kp: number; ki: number; kd: number }; cost: number }

self.onmessage = (e: MessageEvent<TunerRequest>) => {
  const { id, plant, seed } = e.data
  const r = autoTune(plant, seed)
  const res: TunerResponse = { id, gains: r.gains, cost: r.cost }
  self.postMessage(res)
}
