import { useState } from 'react'
import BalanceView from './BalanceView'
import SwarmStages from './SwarmStages'

type Lang = 'en' | 'ja'
type Ev = 'poke' | 'kill' | 'boss-add' | 'boss-remove' | 'dock'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
const OPTIONS: { key: 'balance' | 'coord' | 'dock'; label: { en: string; ja: string }; blurb: { en: string; ja: string } }[] = [
  {
    key: 'balance',
    label: { en: '1  One robot: how it balances', ja: '1  1台のロボット：倒れないしくみ' },
    blurb: {
      en: 'Start here. Each unit of the swarm is a two-wheel self-balancing robot. See how it stays upright, then break it.',
      ja: 'まずここから。スウォームの1台1台は二輪の自己平衡ロボットです。どうやって立ち続けるのかを見て、わざと崩してみましょう。',
    },
  },
  {
    key: 'coord',
    label: { en: '2  Coordination', ja: '2  協調' },
    blurb: {
      en: 'Many balancing robots with no central controller: each only talks to neighbours in range and they agree on a heading.',
      ja: '中央制御なし。各ロボットは通信範囲内の隣とだけ情報を交換し、向きを合意します。',
    },
  },
  {
    key: 'dock',
    label: { en: '3  Docking', ja: '3  ドッキング' },
    blurb: {
      en: 'When a job is too big for one robot, two join side by side into a wider platform.',
      ja: '1台では大きすぎる作業では、2台が並んで結合し、幅広のプラットフォームになります。',
    },
  },
]

/** Swarm explanation in two steps: one robot balancing, then the swarm. */
export default function SwarmSim({ lang, onEvent }: { lang: Lang; onEvent?: (e: Ev) => void }) {
  const [part, setPart] = useState<'balance' | 'coord' | 'dock'>('balance')
  const cur = OPTIONS.find((o) => o.key === part)!
  return (
    <div>
      <div role="group" aria-label={lang === 'en' ? 'Choose a part' : 'パートを選択'} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {OPTIONS.map((o) => (
          <button key={o.key} className="chip" aria-pressed={part === o.key} onClick={() => setPart(o.key)}>{o.label[lang]}</button>
        ))}
      </div>
      <p style={{ margin: '0 0 8px', color: 'var(--muted)', maxWidth: 760 }}>{cur.blurb[lang]}</p>
      {part === 'balance' ? <BalanceView lang={lang} onEvent={() => onEvent?.('poke')} /> : <SwarmStages lang={lang} stage={part === 'coord' ? 2 : 3} onEvent={onEvent} />}
    </div>
  )
}
