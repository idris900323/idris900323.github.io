import { useState } from 'react'
import SpiderView from './SpiderView'
import DogView from './DogView'

type Lang = 'en' | 'ja'
export type GaitEvent = 'tangle' | 'chaos-gait'
type Robot = 'dog' | 'spider'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
const OPTIONS: { key: Robot; label: { en: string; ja: string }; blurb: { en: string; ja: string } }[] = [
  {
    key: 'dog',
    label: { en: 'RoboDog (6 servos)', ja: 'RoboDog（6サーボ）' },
    blurb: {
      en: 'Four-bar leg linkages and two sliding, rotating plates. One diagonal pair of legs steps at a time. Mechanical design by James Bruton (open source).',
      ja: '4節リンクの脚と、滑って回転する2枚のプレート。対角の1組ずつ歩きます。機構設計：James Bruton（オープンソース）。',
    },
  },
  {
    key: 'spider',
    label: { en: 'Spider (2 joints per leg)', ja: 'スパイダー（1脚2関節）' },
    blurb: {
      en: 'Four legs, each with a hip servo that swings the leg and a knee servo that lifts the blade: eight servos in total. Choose a gait below.',
      ja: '4本の脚はそれぞれ、脚を振る股関節サーボと、ブレードを持ち上げる膝サーボを持ち、合計8個のサーボです。下で歩容を選べます。',
    },
  },
]

/** Quadruped lab: switch between the RoboDog mechanism and the spider's two-joint legs. */
export default function GaitSim({ lang, onEvent }: { lang: Lang; onEvent?: (e: GaitEvent) => void }) {
  const [robot, setRobot] = useState<Robot>('dog')
  const cur = OPTIONS.find((o) => o.key === robot)!
  return (
    <div>
      <div role="group" aria-label={lang === 'en' ? 'Choose a robot' : 'ロボットを選択'} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {OPTIONS.map((o) => (
          <button key={o.key} className="chip" aria-pressed={robot === o.key} onClick={() => setRobot(o.key)}>{o.label[lang]}</button>
        ))}
      </div>
      <p style={{ margin: '0 0 8px', color: 'var(--muted)', maxWidth: 760 }}>{cur.blurb[lang]}</p>
      {robot === 'dog' ? <DogView lang={lang} onEvent={() => onEvent?.('chaos-gait')} /> : <SpiderView lang={lang} onEvent={onEvent} />}
    </div>
  )
}
