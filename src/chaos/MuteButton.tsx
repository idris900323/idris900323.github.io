import { useState } from 'react'
import { isMuted, setMuted, sfx } from './sfx'

/** Sound on/off. Shown on the Chaos warning screens and on the Chaos layer, always above everything else. */
export default function MuteButton({ lang }: { lang: 'en' | 'ja' }) {
  const [muted, setM] = useState(isMuted())
  const label = lang === 'en' ? (muted ? 'Sound effects: off. Turn on' : 'Sound effects: on. Mute') : (muted ? '効果音：オフ（オンにする）' : '効果音：オン（ミュートする）')
  return (
    <button className="btn sfx-btn" aria-pressed={!muted} aria-label={label} title={label}
      onClick={() => { const m = !muted; setMuted(m); setM(m); if (!m) sfx('pop') }}>
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  )
}
