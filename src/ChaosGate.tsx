import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { sfx, startMusic } from './chaos/sfx'
import MuteButton from './chaos/MuteButton'

type Lang = 'en' | 'ja'
type L = { en: string; ja: string }

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
const TITLE: L = { en: 'WARNING', ja: '警告' }
const SUB: L = { en: 'A SERIOUS ANNOUNCEMENT (SORT OF)', ja: '重大なお知らせ（のようなもの）' }
const CRAWL: L[] = [
  { en: 'A long time ago, in a portfolio not so far away...', ja: 'ずっと昔、そう遠くないポートフォリオで…' },
  { en: 'You are about to leave the sensible side of this website. The sensible side says goodbye. It will wait for you quietly, with a cup of tea.', ja: 'あなたはこのサイトのまともな側を離れようとしています。まともな側は静かにお茶を飲みながら、あなたの帰りを待っています。' },
  { en: 'Ahead: MUSIC. Questionable music, at exactly the volume that the one person you did not want to hear it will hear it.', ja: 'この先：音楽。聞かれたくない人にだけ、ちょうど聞こえる音量の、ちょっと怪しい音楽です。' },
  { en: 'Ahead: LOUD NOISES, a rocket or two, and at least one moment that will make you say a word you would never say in an interview.', ja: 'この先：大きな音、ロケットが一つか二つ、そして面接では絶対に言わない言葉をつい口にしてしまう瞬間が、少なくとも一つ。' },
  { en: 'The author promises all of this was done on purpose. The author also promises the little robot is not plotting anything. The robot declined to comment.', ja: '作者は、これらすべてがわざとだと約束します。小さなロボットが何も企んでいないことも約束します。ロボットはコメントを控えています。' },
  { en: 'Do NOT open this at work, in a meeting, on a train, or in front of anyone you hope will hire you. If you are a professor: hello, we are very sorry, please press back.', ja: '職場、会議、電車の中、そして採用してほしい人の前では、開かないでください。教授の皆さま：こんにちは、申し訳ありません、お戻りください。' },
  { en: 'If you panic, press ESCAPE. Escape is your friend. Escape has never let anyone down.', ja: 'パニックになったら、Escキーを押してください。Escは味方です。Escは今まで誰も裏切ったことがありません。' },
  { en: 'Press OK only if you accept all of the above, and a few things that were not mentioned above.', ja: '上記すべてと、上記に書かれていないいくつかのことに同意する場合のみ、OKを押してください。' },
]
// The first screen is deliberately plain and professional: it says what this mode is before anything playful happens.
const NOTICE: { title: L; body: L[]; back: L; go: L } = {
  title: { en: 'Before you continue', ja: '続ける前に' },
  body: [
    { en: 'The mode behind this button was made as a joke by the author of this portfolio. It is not part of the professional presentation of the work, and it has no bearing on any application or evaluation.', ja: 'このボタンの先のモードは、本ポートフォリオの作者が冗談として作成したものです。作品の専門的な紹介には含まれず、応募や評価とは一切関係がありません。' },
    { en: 'It contains music, loud sound effects, sudden visual effects and humour that is not suitable for a workplace, a meeting or an interview.', ja: '音楽、大きな効果音、突然の視覚効果、そして職場・会議・面接にはふさわしくないユーモアが含まれます。' },
    { en: 'If you are reviewing this portfolio in a professional capacity, please go back: everything relevant is in the standard version. If you proceed, you can leave at any time with the Escape key or the Restore order button.', ja: '専門的な立場でこのポートフォリオをご覧の場合は、お戻りください。必要な内容はすべて通常版にあります。続ける場合も、Escキーまたは「元に戻す」ボタンでいつでも終了できます。' },
  ],
  back: { en: 'Go back', ja: '戻る' },
  go: { en: 'Proceed', ja: '進む' },
}
const CAUGHT: { title: L; body: L; again: L } = {
  title: { en: 'Heh heh.', ja: 'ふふふ。' },
  body: { en: 'I knew you did not read it. Back to the calm side you go. Read it properly next time: there is a quiz.', ja: '読んでいないと思っていました。穏やかな側にお戻りください。次回はちゃんと読んでくださいね。テストがあります。' },
  again: { en: 'Back to Calm', ja: '穏やかな側へ戻る' },
}
const STEPS: { q: L; yes: L; no: L }[] = [
  { q: { en: 'Are you sure?', ja: '本当によろしいですか？' }, yes: { en: 'Yes', ja: 'はい' }, no: { en: 'No, take me back', ja: 'いいえ、戻る' } },
  { q: { en: 'Are you really sure?', ja: '本当に、本当によろしいですか？' }, yes: { en: 'Yes, really', ja: 'はい、本当に' }, no: { en: 'Not really', ja: 'やっぱりやめる' } },
  { q: { en: 'Seriously?', ja: 'まじで？' }, yes: { en: 'Seriously', ja: 'まじです' }, no: { en: 'I panicked', ja: 'あわてました' } },
  { q: { en: 'There is a perfectly good Calm mode, you know.', ja: '穏やかなモードもありますよ？' }, yes: { en: 'I know', ja: '知ってます' }, no: { en: 'Good point', ja: '確かに' } },
  { q: { en: 'Is your volume where you want it? There is a mute button at the top left.', ja: '音量は今のままで大丈夫ですか？ミュートボタンは左上にあります。' }, yes: { en: 'It is', ja: '大丈夫です' }, no: { en: 'Let me check', ja: '確認する' } },
  { q: { en: 'Last chance. This is not a drill.', ja: '最後のチャンスです。訓練ではありません。' }, yes: { en: 'Do it', ja: 'やって' }, no: { en: 'Abort', ja: '中止' } },
  { q: { en: 'Okay. Final question: did you read the message?', ja: 'では最後の質問：メッセージは読みましたか？' }, yes: { en: 'Yes, I read it', ja: 'はい、読みました' }, no: { en: 'No, I did not', ja: 'いいえ、読んでいません' } },
]

/** CHAOS gate: a long opening crawl, then a run of increasingly silly "are you sure" dialogs. Only a full run of Yes turns Chaos on. */
export default function ChaosGate({ lang, onConfirm, onCancel }: { lang: Lang; onConfirm: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(-2) // -2 = the plain notice, -1 = the crawl, 0 and up = the questions
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const t = (l: L) => l[lang]
  // the crawl has its own music: a looping chiptune track that runs until the visitor presses OK or leaves
  const [ready, setReady] = useState(reduced)
  const [canSkip, setCanSkip] = useState(false)
  const [caught, setCaught] = useState(false) // said they did not read the message on the last question
  const crawlRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!caught) return
    const id = window.setTimeout(onCancel, 7000) // the notice stays long enough to read, then the page goes back to Calm
    return () => clearTimeout(id)
  }, [caught, onCancel])
  const crawlMs = useRef(70000) // how long the crawl runs (set once it is measured)
  // the crawl scrolls at a steady pace whatever the amount of text: measure it, set how far it travels and how long it takes
  useLayoutEffect(() => {
    const el = crawlRef.current
    if (!el || step !== -1 || reduced) return
    const box = el.parentElement!.clientHeight, h = el.offsetHeight
    const sec = Math.max(45, Math.min(100, (box + h) / 80))
    el.style.setProperty('--crawl-end', `-${h + 60}px`)
    el.style.animationDuration = `${sec}s`
    crawlMs.current = sec * 1000
  }, [step, reduced, lang])
  useEffect(() => {
    if (step !== -1) return // music starts only after the visitor has pressed Proceed
    const stop = startMusic()
    const fallback = window.setTimeout(() => setReady(true), crawlMs.current + 10000) // never leave the screen without a way forward
    const skip = window.setTimeout(() => setCanSkip(true), 10000) // a way past the crawl for phones, where typing a shortcut is not possible
    return () => { stop(); clearTimeout(fallback); clearTimeout(skip) }
  }, [step])
  // shortcut: typing "idris" skips the crawl and every question
  useEffect(() => {
    let buf = ''
    const k = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return
      buf = (buf + e.key.toLowerCase()).slice(-5)
      if (buf === 'idris') { sfx('fanfare'); onConfirm() }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [onConfirm])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [onCancel])

  const advance = () => { sfx(step + 1 >= STEPS.length ? 'fanfare' : 'blip'); if (step + 1 >= STEPS.length) onConfirm(); else setStep(step + 1) }
  const s = step >= 0 ? STEPS[step] : null
  // the highlighted "yes" is on the right for every question except the last one, where Yes (dark) is on the left and the highlighted button is No
  const flip = step === STEPS.length - 1

  return (
    <div className={step === -2 ? 'gate pro' : 'gate'} role="dialog" aria-modal="true" aria-label={lang === 'en' ? 'Before you enter Chaos mode' : 'カオスモードに入る前に'}>
      {step === -2 ? (
        <div className="notice">
          <h2>{t(NOTICE.title)}</h2>
          {NOTICE.body.map((b) => <p key={b.en}>{t(b)}</p>)}
          <div className="notice-actions">
            <button className="btn" autoFocus onClick={onCancel}>{t(NOTICE.back)}</button>
            <button className="btn notice-go" onClick={() => setStep(-1)}>{t(NOTICE.go)}</button>
          </div>
        </div>
      ) : caught ? (
        <div className="gate-card">
          <h2>{t(CAUGHT.title)}</h2>
          <p className="caught">{t(CAUGHT.body)}</p>
          <div className="gate-actions">
            <button className="btn chaos-btn" autoFocus onClick={onCancel}>{t(CAUGHT.again)}</button>
          </div>
        </div>
      ) : (<>
      <MuteButton lang={lang} />
      {!s ? (
        <>
          <div className={reduced ? 'crawl crawl-static' : 'crawl'}>
            <div className="crawl-plane">
              <div className="crawl-inner" ref={crawlRef} onAnimationEnd={() => setReady(true)}>
                <h2>{t(TITLE)}</h2>
                <h3>{t(SUB)}</h3>
                {CRAWL.map((p) => <p key={p.en}>{t(p)}</p>)}
              </div>
            </div>
          </div>
          <div className="gate-actions">
            <button className="btn" onClick={onCancel}>{lang === 'en' ? 'Take me back' : '戻る'}</button>
            {canSkip && !ready && <button className="btn" onClick={() => { sfx('blip'); setStep(0) }}>{lang === 'en' ? 'Proceed' : '進む'}</button>}
            {ready && <button className="btn chaos-btn" autoFocus onClick={() => { sfx('alarm'); setStep(0) }}>OK</button>}
          </div>
        </>
      ) : (
        <div className="gate-card">
          <h2>{t(s.q)}</h2>
          <div className="gate-actions" style={{ flexDirection: flip ? 'row-reverse' : 'row' }}>
            <button className={step === STEPS.length - 1 ? 'btn chaos-btn' : 'btn'} onClick={step === STEPS.length - 1 ? () => { sfx('error'); setCaught(true) } : onCancel}>{t(s.no)}</button>
            <button key={step} className={step === STEPS.length - 1 ? 'btn' : 'btn chaos-btn'} autoFocus onClick={advance}>{t(s.yes)}</button>
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}
