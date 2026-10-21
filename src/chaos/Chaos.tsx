// Lazy chunk: loaded ONLY after the CHAOS button is pressed (Calm downloads none of this).
// Every gag is registered through the scheduler (guide §22.8) and can be disabled in config.ts.
import { useCallback, useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import '@fontsource/m-plus-rounded-1c/latin-500.css'
import '@fontsource/m-plus-rounded-1c/latin-800.css'
import '@fontsource/m-plus-rounded-1c/japanese-500.css'
import './chaos.css'
import { chaosConfig, type GagId } from './config'
import { Scheduler, type Tier } from './scheduler'
import { caption } from './captions'
import { subscribe } from '../bus'
import { X } from 'lucide-react'
import { angerBeep, fall, impact, sfx } from './sfx'
import MuteButton from './MuteButton'
import { useStore } from '../store'
import Scout from '../Scout'

const on = (g: GagId) => chaosConfig.gags[g]
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const SIM_EVENTS = new Set(['p2a', 'p2b', 'p2c', 'p3', 'p5', 'p6a', 'p6b', 'p8a', 'p8d', 'p8e', 'p9a', 'p9b'])
const FLYERS = ['🚀', '🛸', '☄️', '🛰️']
const ACH: Record<string, { en: string; ja: string }> = {
  moon: { en: 'Broke the Moon', ja: '月を壊した' },
  roll: { en: 'Rolled the barrel', ja: 'バレルロールをした' },
  letters: { en: 'Scattered the name', ja: '名前を散らかした' },
  sim: { en: 'Poked a simulation', ja: 'シミュレーションを動かした' },
  finale: { en: 'Read all the way down', ja: '最後まで読んだ' },
  rick: { en: 'Got rolled', ja: 'ロールされた' },
  moonup: { en: 'Fell upwards', ja: '上に落ちた' },
  crash: { en: 'Shot down a rocket', ja: 'ロケットを撃墜した' },
  moon3: { en: 'Pressed it a third time', ja: '3回目を押した' },
  evicted: { en: 'Evicted by the robot', ja: 'ロボットに追い出された' },
  cena: { en: 'Heard a name', ja: '名前を聞いた' },
  omae: { en: 'Heard the verdict', ja: '宣告を聞いた' },
}
const GUILT: { en: string; ja: string }[] = [
  { en: 'That was Captain Pip. He had a family, a goldfish, and a lifelong dream of reaching the Moon. He was nearly there.', ja: 'あれはピップ船長でした。家族も金魚もいて、月に行くのが夢でした。もう少しだったのに。' },
  { en: 'It was only on its way to a birthday party. There was a cake. The cake is now alone.', ja: 'ただ誕生日パーティーに向かっていただけなのに。ケーキは、今ひとりぼっちです。' },
  { en: 'Its mother waved goodbye this morning. Someone has to call her now, and it is going to be you.', ja: '今朝、お母さんが手を振って見送ったのに。これから電話するのは、あなたです。' },
  { en: 'It only wanted to say hello. It practised the whole way here. You did not even wave back.', ja: 'ただ挨拶したかっただけなのに。ここまでずっと練習してきたのに。あなたは手も振り返しませんでした。' },
  { en: 'Three crew members, one plant, and a very small flag. All gone. I hope the click was worth it.', ja: '乗員3名、植木鉢1つ、小さな旗1本。すべて失われました。そのクリック、価値はありましたか。' },
]
/** One short comment per section, shown only after the reader has been in that section for a moment. `slot` (from the joke workbook) wins if Idris has chosen one. */
const SECTION_NOTES: Record<string, { slot?: string; en: string; ja: string; alt?: { en: string; ja: string } }> = {
  pid: { en: 'The servo is thinking. Slowly. Give it a gain or two.', ja: 'サーボは考え中です。ゆっくりと。ゲインを少し足してあげてください。', alt: { en: 'Tuning by hand is a hobby. Tuning by search is a project.', ja: '手でゲインを合わせるのは趣味。探索で合わせるのはプロジェクトです。' } },
  swarm: { en: 'No leader in this one. Which is also how some group projects feel.', ja: 'このスウォームにはリーダーがいません。グループ課題みたいですね。', alt: { en: 'Three small robots, zero managers.', ja: '小さなロボット3台、上司はゼロ。' } },
  net: { en: 'Yes, it catches space junk. No, nobody has sent an invoice.', ja: '宇宙ゴミを捕まえます。請求書はまだ誰も送っていません。', alt: { en: 'Capture rate is high. Paperwork is still pending.', ja: '捕獲率は高めです。書類はまだ保留中です。' } },
  abb: { slot: 'p10', en: 'The arm is practising its handshake.', ja: 'アームは握手の練習中です。', alt: { en: 'An industrial arm, a bin of parts, and a lot of patience.', ja: '産業用アームと部品の山、そして大量の忍耐。' } },
  cpu8: { en: 'Eight bits. Every wire placed by hand, and the flicker was one of them.', ja: '8ビット。配線はすべて手作業で、チラつきの犯人もその中の1本でした。', alt: { en: 'It computes. Slowly. By hand-placed wire.', ja: '計算します。ゆっくりと。手配線で。' } },
  quadrupeds: { en: 'Two robots, eight legs between them, still no fur.', ja: 'ロボット2台、脚は合わせて8本。それでも毛はありません。', alt: { en: 'Eight legs in total. Perfectly balanced, as all things should not be.', ja: '脚は合計8本。バランスは完璧、のはずです。' } },
  vehicles: { en: 'Bluetooth connects when it feels like it. Be patient.', ja: 'Bluetoothは気が向いたときに繋がります。気長にどうぞ。', alt: { en: 'Four wheels, two tracks, and one stubborn Bluetooth link.', ja: '四輪、二本のキャタピラ、そして頑固なBluetooth。' } },
  pipe: { en: 'Somewhere in this pipe a leak is hiding. Do not tell it I said so.', ja: 'このパイプのどこかに漏れが隠れています。私が言ったとは内緒で。', alt: { en: 'The leak is somewhere in here. The pipe is not telling.', ja: '漏れはこのどこかに。パイプは黙秘中です。' } },
  stepscribe: { en: 'A tool that explains CAD so nobody has to. Lazy, but in a clever way.', ja: 'CADを説明してくれるツール。怠け者の発明ですが、賢い怠け方です。', alt: { en: 'CAD, explained in plain text.', ja: 'CADを、ふつうの文章で説明します。' } },
  subtlebotic: { en: 'This is where the textbook boost converter met reality.', ja: '教科書の昇圧コンバータが、現実と出会った場所です。', alt: { en: 'Datasheets promise. Boards decide.', ja: 'データシートは約束し、基板が決めます。' } },
}
const MAD: { en: string; ja: string }[] = [
  { en: 'Hi.', ja: 'やあ。' },
  { en: 'Please stop.', ja: 'やめてください。' },
  { en: 'That tickles. (It does not.)', ja: 'くすぐったい。（嘘です）' },
  { en: 'I am working.', ja: '仕事中です。' },
  { en: 'Hey!', ja: 'ちょっと！' },
  { en: 'I said hey.', ja: 'ちょっとって言いましたよ。' },
  { en: 'I have feelings. Mostly voltage.', ja: '感情があります。ほぼ電圧ですが。' },
  { en: 'Stop poking the robot.', ja: 'ロボットをつつかないで。' },
  { en: 'I will count to ten.', ja: '10まで数えます。' },
  { en: 'TEN.', ja: '10。' },
  { en: 'I am getting angry.', ja: '怒りますよ。' },
  { en: 'Really?!', ja: 'ほんとに？！' },
  { en: 'This is your final warning.', ja: 'これが最後の警告です。' },
  { en: 'I AM DONE.', ja: 'もう限界です。' },
]
const PILE_NOTES: { en: string; ja: string }[] = [
  {
    en: 'Now look at what you did. I spent hours attaching every single thing on this page, and now I will have to attach it all over again. Close this and I will start putting it back. Slowly.',
    ja: 'ほら、何をしてくれたのか見てください。このページのすべてを何時間もかけて取り付けたのに、また一からやり直しです。これを閉じたら、ゆっくり元に戻していきます。',
  },
  {
    en: 'Again?! I had only just finished putting everything back. Every heading, every picture, every button, and you sent it all up to the ceiling. I trusted you. I am not even angry, I am just so disappointed. Close this and I will start over, slowly, and I will not be happy about it.',
    ja: 'またですか？！ やっとすべてを元に戻し終えたところだったのに。見出しも、写真も、ボタンも、全部天井に飛ばして。信じていたのに。怒っているというより、ただただ、がっかりです。これを閉じたら、また最初からやり直します。ゆっくりと、不満を抱えたまま。',
  },
]
const TAUNTS: { en: string; ja: string }[] = [
  { en: 'Can’t catch me!', ja: '捕まえられないよ！' },
  { en: 'Too slow.', ja: '遅いなあ。' },
  { en: 'Nope!', ja: 'ざんねん！' },
  { en: 'Over here!', ja: 'こっちだよ！' },
  { en: 'Nice try.', ja: 'おしい！' },
  { en: 'Missed me!', ja: 'はずれ！' },
  { en: 'Is that all you have?', ja: 'それだけ？' },
]
const ACH_KEY = 'achievements'
const loadAch = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(ACH_KEY) ?? '[]')
    return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x in ACH))] : []
  } catch { return [] }
}
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

type Stamp = { id: number; x: number; y: number; text: string }

// One scheduler per page load so dismissals and play caps persist across Restore order and CHAOS again.
const shared = new Scheduler(() => performance.now())

export default function Chaos() {
  const lang = useStore((s) => s.lang)
  const langRef = useRef(lang)
  langRef.current = lang
  const setMode = useStore((s) => s.setMode)
  const sched = useRef<Scheduler | null>(shared)
  // the Moon: press 1 = everything falls down, press 2 = everything falls up, press 3 = a song
  const [moonCount, setMoonCount] = useState(0)
  const moonId = useRef('moon0')
  const [fly, setFly] = useState<string | null>(null)
  const [flyPath, setFlyPath] = useState<React.CSSProperties>({})
  const [toast, setToast] = useState<string | null>(null)
  const [stamps, setStamps] = useState<Stamp[]>([])
  const [intro, setIntro] = useState(true)
  const [pile, setPile] = useState(false)
  const [cookie, setCookie] = useState(false)
  type Crumb = { id: number; x: number; y: number; s: number; r: number; d: number; dl: number }
  const [storm, setStorm] = useState<Crumb[] | null>(null) // clicking Eat it fills the screen with cookies
  const [bites, setBites] = useState(0) // the cookie in the banner gets eaten bite by bite
  const [finale, setFinale] = useState(false)
  const [roll, setRoll] = useState(false)
  const [progress, setProgress] = useState(0)
  const [nap, setNap] = useState(false)
  // achievements are remembered in this browser, so being evicted (or coming back later) does not reset the count
  const [ach, setAch] = useState<string[]>(loadAch)
  const [achOpen, setAchOpen] = useState(false)
  const awarded = useRef(new Set<string>(ach))
  const award = useCallback((id: string) => {
    if (awarded.current.has(id)) return
    awarded.current.add(id)
    setAch((a) => { const n = [...a, id]; try { localStorage.setItem(ACH_KEY, JSON.stringify(n)) } catch { /* storage can be blocked */ } return n })
    setTimeout(() => sfx('chime'), 350)
  }, [])
  const [bubble, setBubble] = useState<string | null>(null)
  const [rick, setRick] = useState(false)
  const [boom, setBoom] = useState<{ id: number; x: number; y: number } | null>(null)
  const [crash, setCrash] = useState<{ id: number; x: number; y: number; emoji: string; dy: number } | null>(null)
  const dock = useRef<HTMLDivElement>(null)
  const [anger, setAnger] = useState(0)
  const prevP = useRef(0)
  const calmDown = useRef(0)
  const bubbleTimer = useRef(0)
  const setEvicted = useStore((s) => s.setEvicted)
  const [omae, setOmae] = useState(0)
  const [cena, setCena] = useState(0)
  const [pileStage, setPileStage] = useState(0)
  const [restoring, setRestoring] = useState(false) // the page is still being put back: no second press yet
  const restoreTimer = useRef(0)
  const [noteUp, setNoteUp] = useState(false)
  const noteTimer = useRef(0)
  const xBtn = useRef<HTMLButtonElement>(null)
  const xDodges = useRef(0)
  const rickOpenedAt = useRef(0) // the X runs away from the pointer for the first 40 seconds, then holds still (Esc always closes)
  useEffect(() => { if (rick) rickOpenedAt.current = performance.now() }, [rick])
  const [xPos, setXPos] = useState<{ x: number; y: number } | null>(null)
  const [cenaPos, setCenaPos] = useState<{ x: number; y: number } | null>(null)
  // a taunt pops up beside the X each time it runs away (rick roll and the John Cena video)
  const [taunt, setTaunt] = useState<{ id: number; text: string; x: number; y: number } | null>(null)
  const tauntN = useRef(0)
  const tauntTimer = useRef(0)
  const sayTaunt = useCallback((x: number, y: number) => {
    const n = ++tauntN.current
    const t = TAUNTS[(n * 5 + Math.floor(Math.random() * 3)) % TAUNTS.length]
    setTaunt({ id: n, text: t[langRef.current], x, y })
    sfx('boing')
    clearTimeout(tauntTimer.current)
    tauntTimer.current = window.setTimeout(() => setTaunt(null), 1500)
  }, [])
  const cenaX = useRef<HTMLButtonElement>(null)
  const cenaShownAt = useRef(0) // the X on the video runs away for its first 40 seconds, then holds still (Esc always closes)
  useEffect(() => { if (cena === 3) cenaShownAt.current = performance.now() }, [cena])
  const [stops, setStops] = useState<{ id: string; at: number }[]>([])
  const toastTimer = useRef<number>(0)
  const collapse = useRef<{ stop: (slow?: boolean) => void } | null>(null)

  const run = useCallback((id: string, tier: Tier, prompted: boolean, cooldownMs?: number) => {
    return sched.current?.start({ id, tier, prompted, cooldownMs }) ?? false
  }, [])

  const quietRef = useRef(false) // no comments, stamps or banners while the page is falling or being put back
  const lastSay = useRef<{ text: string; at: number; replayed: boolean } | null>(null)
  const sayText = useCallback((text: string, ms = 8000) => {
    if (quietRef.current) return false
    setToast(text)
    sfx('ding')
    lastSay.current = { text, at: performance.now(), replayed: false }
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
    return true
  }, [])
  const say = useCallback((slot: string, ms = 8000) => {
    const text = caption(slot, langRef.current)
    return text ? sayText(text, ms) : false
  }, [sayText])

  // scheduler + transformation intro + console banner
  useEffect(() => {
    sched.current = shared
    shared.markStart()
    sfx('alarm')
    const t = setTimeout(() => setIntro(false), reduced() ? 300 : 1600)
    if (on('consoleBanner')) {
      const c = caption('g13', langRef.current)
      console.log('%cIdris Sadiq', 'font:800 20px sans-serif;color:#ff7a45')
      if (c) console.log(c)
    }
    return () => { clearTimeout(t) }
  }, [])

  // Esc restores order; announce mode change
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.querySelector('.cena-video')) { setCena(0); sched.current?.end('cena'); return }
      if (e.key === 'Escape' && document.querySelector('.rick')) { setRick(false); sched.current?.end('rick'); return }
      if (e.key === 'Escape') { sched.current?.noteRestore(); collapse.current?.stop(); collapse.current = null; setMode('calm') }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [setMode])

  // tidy the pile if Chaos unmounts (Esc or the header toggle) while it is active
  useEffect(() => () => { collapse.current?.stop(); collapse.current = null }, [])

  // reading detection: slow scrolling or recent small scrolls pause unprompted gags
  useEffect(() => {
    let lastY = scrollY, lastT = performance.now(), timer = 0, lastScrollY = scrollY, lastSwish = 0
    const onScroll = () => {
      const now = performance.now(), dy = Math.abs(scrollY - lastY), dt = now - lastT
      lastY = scrollY; lastT = now
      sched.current?.setReading(dy / Math.max(1, dt) < 0.6)
      clearTimeout(timer)
      timer = window.setTimeout(() => sched.current?.setReading(false), 2000)
      const h = document.documentElement.scrollHeight - innerHeight
      const pr = h > 0 ? Math.round((scrollY / h) * 50) / 50 : 0
      setProgress((p0) => (p0 === pr ? p0 : pr))
      if (dy / Math.max(1, dt) > 2.5 && now - lastSwish > 1500) { lastSwish = now; sfx('swish') }
      // a comment is not waved away by scrolling; if one was missed, scrolling back up plays it once more
      const ls = lastSay.current
      if (ls && !ls.replayed && scrollY < lastScrollY - 200 && performance.now() - ls.at > 1500 && performance.now() - ls.at < 90000) {
        ls.replayed = true
        setToast('\u21BA ' + ls.text)
        clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => setToast(null), 8000)
      }
      lastScrollY = scrollY
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [run, say])

  // ambient fly-by (A) and fake toasts (A)
  useEffect(() => {
    if (!on('flyby')) return
    const id = setInterval(() => {
      if (document.hidden) return
      const s = sched.current
      if (!s) return
      if (on('flyby') && Math.random() < s.ambientDensity() && run('flyby', 'A', false, 40000)) {
        // every flyer gets its own path: random side, height, wobble, spin and speed
        const R = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
        const dir = Math.random() < 0.5 ? 1 : -1
        const y0 = R(6, 66), y1 = R(6, 66)
        const wob = (f: number) => Math.max(4, Math.min(76, y0 + (y1 - y0) * f + R(-22, 22)))
        setFlyPath({
          ['--x0' as string]: dir > 0 ? '-14vw' : '114vw', ['--x1' as string]: dir > 0 ? '114vw' : '-14vw',
          ['--y0' as string]: `${y0}vh`, ['--ya' as string]: `${wob(0.33)}vh`, ['--yb' as string]: `${wob(0.66)}vh`, ['--y1' as string]: `${y1}vh`,
          ['--r0' as string]: `${R(-30, 30)}deg`, ['--r1' as string]: `${R(-40, 40)}deg`, ['--r2' as string]: `${R(-40, 40)}deg`, ['--r3' as string]: `${R(-30, 30)}deg`,
          ['--dur' as string]: `${R(7, 9).toFixed(1)}s`,
        })
        setFly(FLYERS[Math.floor(Math.random() * FLYERS.length)])
        sfx('whoosh')
        setTimeout(() => { setFly(null); s.end('flyby') }, 9500)
      }
    }, 9000)
    return () => clearInterval(id)
  }, [run])

  // click stamps (B) and Scout-free click dismiss of toasts
  useEffect(() => {
    if (!on('clickStamps')) return
    let n = 0, last = 0
    const c = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('button, a, input, select, textarea, label, [role="tab"]') || quietRef.current) return
      const now = performance.now()
      if (now - last < 450) return
      last = now
      const first = caption('g3', langRef.current)
      if (!first) return
      const words = langRef.current === 'en' ? [first, 'ZAP', 'PING'] : [first, 'ビリッ', 'ピコーン']
      const text = words[n % words.length]
      const sid = ++n
      setStamps((s) => [...s.slice(-3), { id: sid, x: e.clientX, y: e.clientY, text }])
      sfx('pop')
      setTimeout(() => setStamps((s) => s.filter((x) => x.id !== sid)), 700)
      setToast((t0) => { if (t0) sched.current?.noteDismiss(); return null })
    }
    addEventListener('click', c)
    return () => removeEventListener('click', c)
  }, [])

  // barrel roll: Konami code or typing "roll", every single time (not scheduled, so nothing can refuse it)
  useEffect(() => {
    if (!on('barrelRoll')) return
    let kBuf: string[] = [], tBuf = '', spinning = false, rolls = 0
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      kBuf = [...kBuf, e.key].slice(-10)
      tBuf = (tBuf + e.key.toLowerCase()).slice(-4)
      if (kBuf.join() === KONAMI.join() || tBuf === 'roll') {
        kBuf = []; tBuf = ''
        if (spinning) return
        award('roll')
        if (rolls++ === 0) say('g4', 4500)
        if (reduced()) return
        spinning = true
        setRoll(true)
        spinPage(() => { spinning = false; setRoll(false) })
      }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [say, award])

  // selection commentary (B)
  useEffect(() => {
    if (!on('selection')) return
    const up = () => {
      const s = getSelection()?.toString() ?? ''
      if (s.length > 12 && run('sel', 'B', true, 15000)) { say('g12', 4500); sched.current?.end('sel') }
    }
    addEventListener('mouseup', up)
    return () => removeEventListener('mouseup', up)
  }, [run, say])

  // idle nap (A) + tab title
  useEffect(() => {
    if (!on('idleNap')) return
    let t = 0
    let original = document.title
    const wake = () => { setNap(false); clearTimeout(t); t = window.setTimeout(() => setNap(true), 10000) }
    wake()
    for (const e of ['mousemove', 'keydown', 'scroll', 'touchstart']) addEventListener(e, wake, { passive: true })
    const vis = () => {
      if (document.hidden) { original = document.title; const c = caption('g8', langRef.current); if (c && c.length > 12) document.title = c }
      else document.title = original
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearTimeout(t); document.title = original
      for (const e of ['mousemove', 'keydown', 'scroll', 'touchstart']) removeEventListener(e, wake)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  // cookie banner (once per session, after a pause)
  useEffect(() => {
    if (!on('cookieBanner')) return
    try { if (sessionStorage.getItem('cookie')) return } catch { /* ignore */ }
    const id = setTimeout(() => setCookie(true), 14000)
    return () => clearTimeout(id)
  }, [])
  const closeCookie = () => { setCookie(false); setBites(0); try { sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } }
  const cookieStorm = () => {
    sfx('chomp')
    if (reduced()) return
    const n = innerWidth < 700 ? 70 : 130
    setStorm(Array.from({ length: n }, (_, i) => ({ id: i, x: Math.random() * 96, y: 6 + Math.random() * 88, s: 30 + Math.random() * 46, r: (Math.random() - 0.5) * 720, d: 0.9 + Math.random() * 0.9, dl: Math.random() * 1.5 })))
    for (const [k, ms] of [[1, 250], [2, 600], [3, 1000], [4, 1500]] as const) setTimeout(() => sfx(k % 2 ? 'chomp' : 'pop'), ms)
    setTimeout(() => setStorm(null), 4400)
  }
  useEffect(() => {
    if (!cookie || reduced()) return
    const id = window.setInterval(() => {
      setBites((b) => {
        if (b >= 5) return b
        sfx('chomp')
        return b + 1
      })
    }, 1500)
    return () => clearInterval(id)
  }, [cookie])
  useEffect(() => {
    if (bites < 5) return
    const id = window.setTimeout(closeCookie, 1400) // nothing left to eat: the banner leaves with it
    return () => clearTimeout(id)
  }, [bites])

  // finale (C): when the contact section is reached, once
  useEffect(() => {
    if (!on('finale')) return
    const el = document.getElementById('contact')
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && run('finale', 'C', true)) {
        io.disconnect(); setFinale(true); award('finale'); sfx('fanfare'); say('g15', 7000)
        setTimeout(() => { setFinale(false); sched.current?.end('finale') }, reduced() ? 1000 : 4500)
      }
    }, { rootMargin: '-30% 0px -20% 0px', threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [run, say, award])

  // scroll rail stops: where each main section sits along the page
  useEffect(() => {
    if (!on('scrollRail')) return
    const measure = () => {
      const h = document.documentElement.scrollHeight - innerHeight
      if (h <= 0) return
      setStops(['work', 'path', 'contact'].flatMap((id) => {
        const el = document.getElementById(id)
        return el ? [{ id, at: Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY) / h)) }] : []
      }))
    }
    const t = setTimeout(measure, 800)
    addEventListener('resize', measure)
    return () => { clearTimeout(t); removeEventListener('resize', measure) }
  }, [])

  // random shake + rick roll while scrolling: decided once per page load (about 8 in 10 get it), after a random amount of scrolling
  useEffect(() => {
    if (!on('rickRoll')) return
    try { if (sessionStorage.getItem('rolled')) return } catch { /* ignore */ }
    const goal = 1800 + Math.random() * 3200 // everyone gets it, after a random amount of scrolling
    let travelled = 0, last = scrollY, done = false
    const onScroll = () => {
      if (document.documentElement.classList.contains('all-visible')) { last = scrollY; return } // the page falling is not reading
      travelled += Math.abs(scrollY - last)
      last = scrollY
      if (done || travelled < goal) return
      if (!run('rick', 'C', true)) return
      done = true
      try { sessionStorage.setItem('rolled', '1') } catch { /* ignore */ }
      const root = document.documentElement
      if (!reduced()) root.classList.add('shake')
      award('rick'); sfx('shake')
      setTimeout(() => { root.classList.remove('shake'); setRick(true) }, reduced() ? 0 : 1700)
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); document.documentElement.classList.remove('shake') }
  }, [run, award])

  // buttons in the page body step away from the cursor, at most twice each; never the controls that matter
  useEffect(() => {
    if (!on('dodge') || reduced() || matchMedia('(pointer: coarse)').matches) return
    const SAFE = '.chaos-layer, .site-header, .sim, .restore, .rick, .moon, .cookie, #contact, .gallery'
    const moved = new Set<HTMLElement>()
    let busy = 0
    const move = (e: PointerEvent) => {
      const b = (e.target as HTMLElement | null)?.closest?.('main .btn, main .chip') as HTMLElement | null
      if (!b || b.closest(SAFE) || busy) return
      const n = Number(b.dataset.dodged ?? 0)
      if (n >= 2 || Math.random() > 0.55) return
      const r = b.getBoundingClientRect()
      const ang = Math.random() * Math.PI * 2
      const dx = Math.cos(ang) * (r.width + 40), dy = Math.sin(ang) * 60
      b.dataset.dodged = String(n + 1)
      sfx('boing')
      b.style.transition = 'transform .25s cubic-bezier(.3,1.6,.5,1)'
      b.style.transform = `translate(${Math.max(-r.left + 8, Math.min(innerWidth - r.right - 8, dx))}px, ${dy}px) rotate(${(Math.random() - 0.5) * 14}deg)`
      moved.add(b); busy = window.setTimeout(() => { busy = 0 }, 400)
      setTimeout(() => { b.style.transform = ''; }, 2200)
      if (n === 1) sayText(langRef.current === 'en' ? 'It does not want to be clicked. Try again.' : 'クリックされたくないようです。もう一度どうぞ。', 4500)
    }
    document.addEventListener('pointerover', move)
    return () => { document.removeEventListener('pointerover', move); clearTimeout(busy); moved.forEach((b) => { b.style.transform = ''; b.style.transition = ''; delete b.dataset.dodged }) }
  }, [sayText])

  // jumpscare: once per page load, at a random point after the reader has scrolled a good way
  useEffect(() => {
    if (!on('cena')) return
    try { if (sessionStorage.getItem('cena')) return } catch { /* ignore */ }
    if (Math.random() > 0.75) return
    const goal = 5000 + Math.random() * 6000
    let travelled = 0, last = scrollY, done = false
    const onScroll = () => {
      if (document.documentElement.classList.contains('all-visible')) { last = scrollY; return }
      travelled += Math.abs(scrollY - last); last = scrollY
      if (done || travelled < goal || document.documentElement.classList.contains('shake') || document.querySelector('.rick, .omae')) return
      if (!run('cena', 'C', true)) return
      done = true
      try { sessionStorage.setItem('cena', '1') } catch { /* ignore */ }
      award('cena')
      setCena(1)
      setTimeout(() => setCena(2), 1050)
      setTimeout(() => setCena(3), 2600)
      if (!reduced()) { document.documentElement.classList.add('shake'); setTimeout(() => document.documentElement.classList.remove('shake'), 2300) }
      setTimeout(() => { setCena((c) => (c === 3 ? c : 0)); if (!document.querySelector('.cena-video')) sched.current?.end('cena') }, 2700)
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => { removeEventListener('scroll', onScroll); document.documentElement.classList.remove('shake') }
  }, [run, award])

  // omae: type it anywhere
  useEffect(() => {
    if (!on('omae')) return
    let buf = '', showing = false
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      buf = (buf + e.key.toLowerCase()).slice(-4)
      if (buf !== 'omae' || showing) return // every time it is typed, unless it is already on screen
      buf = ''
      showing = true
      award('omae')
      setOmae(1); sfx('sting')
      setTimeout(() => { setOmae(2); sfx('nani') }, 1700)
      setTimeout(() => { setOmae(0); showing = false }, 4200)
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [award])

  // click a line of text: it breaks into words that fall, then re-forms
  useEffect(() => {
    if (!on('shatter') || reduced()) return
    let last = 0
    const c = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('main p, main li, main h3')
      if (!el || el.closest('.sim, .rick, a, button') || el.children.length > 0 || el.dataset.broken) return
      const text = el.textContent ?? ''
      if (text.length < 12 || text.length > 240 || performance.now() - last < 3500 || Math.random() > 0.45) return
      last = performance.now()
      el.dataset.broken = '1'
      sfx('crack')
      const original = el.innerHTML
      const words = text.split(/(\s+)/)
      el.textContent = ''
      for (const w of words) {
        if (/^\s+$/.test(w) || !w) { el.append(w); continue }
        const sp = document.createElement('span')
        sp.textContent = w
        sp.className = 'shard'
        sp.style.setProperty('--tx', `${(Math.random() - 0.5) * 160}px`)
        sp.style.setProperty('--ty', `${60 + Math.random() * 140}px`)
        sp.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`)
        sp.style.animationDelay = `${Math.random() * 0.35}s`
        el.append(sp)
      }
      setTimeout(() => { el.innerHTML = original; delete el.dataset.broken }, 3200)
    }
    document.addEventListener('click', c)
    return () => document.removeEventListener('click', c)
  }, [])

  // section notes: a comment arrives only once the reader has settled in that section (its middle band of the screen for 1.5 s)
  useEffect(() => {
    if (!on('sectionNotes')) return
    let lastNote = -Infinity, lastScrollAt = 0
    const onScroll = () => { lastScrollAt = performance.now() }
    addEventListener('scroll', onScroll, { passive: true })
    const timers = new Map<string, number>()
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = e.target.id
        if (!e.isIntersecting) { clearTimeout(timers.get(id)); timers.delete(id); continue }
        // the comment waits until the reader has really arrived: the section is in the upper part of the screen and the scrolling has stopped
        const arrive = () => {
          const n = SECTION_NOTES[id]
          if (performance.now() - lastScrollAt < 1200) { timers.set(id, window.setTimeout(arrive, 600)); return }
          if (!n || performance.now() - lastNote < 12000 || !run('sec-' + id, 'B', true, 600000)) return
          lastNote = performance.now()
          const text = (n.slot && caption(n.slot, langRef.current)) || (n.alt && Math.random() < 0.5 ? n.alt : n)[langRef.current]
          sayText(text, 9500)
          setTimeout(() => sched.current?.end('sec-' + id), 9600)
        }
        timers.set(id, window.setTimeout(arrive, 2500))
      }
    }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 })
    for (const id of Object.keys(SECTION_NOTES)) { const el = document.getElementById(id); if (el) io.observe(el) }
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); timers.forEach((t) => clearTimeout(t)) }
  }, [run, sayText])

  // a very soft tick when the pointer moves onto a button or link
  useEffect(() => {
    let last = 0
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = (e.target as HTMLElement).closest?.('button, .btn, .chip, a, summary, .thumb')
      if (!el || el.closest('.sfx-btn, .flyby, .scout-dock')) return
      const now = performance.now()
      if (now - last < 120) return
      last = now
      sfx('tick')
    }
    document.addEventListener('pointerover', over)
    return () => document.removeEventListener('pointerover', over)
  }, [])

  // a small blip for every button, chip, tab and link in the page (the dedicated gags have their own sounds)
  useEffect(() => {
    const c = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('.sfx-btn, .flyby, .scout-dock, .moon')) return
      if (el.closest('button, .btn, .chip, a, summary, [role="tab"], .thumb')) sfx('blip')
    }
    document.addEventListener('click', c, true)
    return () => document.removeEventListener('click', c, true)
  }, [])

  // a soft tick each time the rocket on the scroll rail passes a section stop
  useEffect(() => {
    if (!on('scrollRail')) return
    const prev = prevP.current
    prevP.current = progress
    for (const st of stops) if ((prev < st.at && progress >= st.at) || (prev > st.at && progress <= st.at)) { sfx('pop'); break }
  }, [progress, stops])

  // simulation gags (P-series)
  useEffect(() => {
    if (!on('simGags')) return
    return subscribe((name) => {
      if (!SIM_EVENTS.has(name)) return
      award('sim'); sfx('blip')
      if (run('sim-' + name, 'B', true, 12000)) { say(name, 6500); setTimeout(() => sched.current?.end('sim-' + name), 6600) }
    })
  }, [run, say, award])

  // Moon (G1): gravity collapse
  const press = useCallback(() => {
    if (pile || restoring || moonCount >= 3) return
    const stage = moonCount
    const id = 'moon' + stage
    if (!run(id, 'C', true)) return
    setMoonCount(stage + 1)
    if (stage === 2) { // third press: no physics, just the song
      award('moon3'); sched.current?.end(id)
      sfx('warp'); setRick(true)
      return
    }
    if (reduced()) { say('g1', 4000); sched.current?.end(id); return }
    moonId.current = id
    quietRef.current = true; setToast(null); setStorm(null)
    fall(stage === 0 ? 1 : -1)
    setPile(true)
    setPileStage(stage)
    setNoteUp(false)
    clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNoteUp(true), 4300) // once it has all landed, the page speaks
    award(stage === 0 ? 'moon' : 'moonup')
    collapse.current = gravityCollapse(stage === 0 ? 1 : -1)
  }, [pile, restoring, moonCount, run, say, award])

  const restore = useCallback(() => {
    clearTimeout(noteTimer.current)
    setNoteUp(false)
    const ms = collapse.current?.stop(true) ?? 0 // slowly
    collapse.current = null
    sfx('restore')
    setPile(false)
    setRestoring(true)
    clearTimeout(restoreTimer.current)
    restoreTimer.current = window.setTimeout(() => { setRestoring(false); quietRef.current = false }, ms + 300)
    sched.current?.end(moonId.current)
  }, [])

  // title prank (G2): click the name
  useEffect(() => {
    if (!on('moon')) return
    const h = document.querySelector<HTMLElement>('h1[data-name]')
    if (!h) return
    const c = () => {
      if (reduced() || !run('prank', 'C', true)) return
      h.querySelectorAll<HTMLElement>('.ltr').forEach((l) => {
        l.style.setProperty('--tx', `${(Math.random() - 0.5) * 220}px`)
        l.style.setProperty('--ty', `${Math.random() * 160 + 20}px`)
        l.style.setProperty('--rot', `${(Math.random() - 0.5) * 160}deg`)
      })
      h.dataset.prank = '1'
      sfx('crack')
      award('letters')
      say('g2', 6000)
      setTimeout(() => { delete h.dataset.prank; sched.current?.end('prank') }, 2800)
    }
    h.addEventListener('click', c)
    return () => h.removeEventListener('click', c)
  }, [run, say, award])

  // Scout clicks: every click gets a short remark and the robot gets angrier; too many and the site explodes and evicts you
  const clicks = useRef(0)
  const poke = () => {
    if (!on('scoutClicks')) return
    clicks.current++
    const n = clicks.current
    clearTimeout(calmDown.current)
    calmDown.current = window.setTimeout(() => { clicks.current = 0; setAnger(0); setBubble(null) }, 7000)
    if (n > MAD.length) {
      const r = dock.current?.getBoundingClientRect()
      clearTimeout(calmDown.current); clearTimeout(bubbleTimer.current)
      setBubble(null)
      sfx('boom'); award('evicted')
      if (r) { setBoom({ id: Date.now(), x: r.left + r.width / 2, y: r.top + r.height / 2 }); setTimeout(() => setBoom(null), 1800) }
      if (!reduced()) { document.documentElement.classList.add('shake'); setTimeout(() => document.documentElement.classList.remove('shake'), 1100) }
      setTimeout(() => {
        clicks.current = 0
        setEvicted(true)
        setMode('calm')
        scrollTo({ top: 0, behavior: 'instant' })
      }, reduced() ? 400 : 1500)
      return
    }
    setBubble(MAD[n - 1][langRef.current])
    setAnger(n)
    angerBeep(n)
    clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setBubble(null), 2400)
  }

  const pct = Math.round(progress * 100)

  return (
    <div className={roll ? 'chaos-layer barrel' : 'chaos-layer'}>
      <p className="sr-only" role="status">
        {lang === 'en' ? 'Chaos mode on. Decorative animations active. Press Escape to restore.' : 'カオスモード。装飾アニメーションが動いています。Escapeキーで元に戻せます。'}
      </p>
      {intro && !reduced() && (
        <div className="intro" aria-hidden="true">
          <div className="intro-box">{caption('warn', lang) ?? ''}</div>
          <span className="intro-rocket">🚀</span>
        </div>
      )}
      {fly && (
        <div className="flyby" aria-hidden="true" style={flyPath} onClick={(e) => {
          e.stopPropagation()
          const r = e.currentTarget.getBoundingClientRect()
          const emoji = fly
          setFly(null); sched.current?.end('flyby')
          sfx('whistle')
          const drop = Math.max(80, innerHeight - r.top - 70)
          setCrash({ id: Date.now(), x: r.left, y: r.top, emoji, dy: drop })
          setTimeout(() => {
            setCrash(null)
            setBoom({ id: Date.now(), x: r.left + 60, y: innerHeight - 34 })
            setTimeout(() => setBoom(null), 1800)
            sfx('boom'); award('crash')
            const g = GUILT[Math.floor(Math.random() * GUILT.length)]
            sayText(g[langRef.current], 10500)
            if (!reduced()) { document.documentElement.classList.add('shake'); setTimeout(() => document.documentElement.classList.remove('shake'), 650) }
          }, reduced() ? 300 : 1300)
        }}>{fly}</div>
      )}
      {crash && (
        <div key={crash.id} className="crash" aria-hidden="true" style={{ left: crash.x, top: crash.y, ['--dy' as string]: `${crash.dy}px` }}>
          <span className="crash-ship">{crash.emoji}</span>
          <span className="crash-smoke" style={{ animationDelay: '0s' }}>💨</span>
          <span className="crash-smoke" style={{ animationDelay: '.25s', left: -34 }}>💨</span>
          <span className="crash-smoke" style={{ animationDelay: '.5s', left: -58 }}>💨</span>
        </div>
      )}
      {boom && (
        <div key={boom.id} className="boom" aria-hidden="true" style={{ left: boom.x, top: boom.y }}>
          <span className="boom-flash" />
          <span className="boom-core">💥</span>
          {['🔥', '💥', '🔥', '✨', '💥', '🔥', '✨', '💥'].map((e, i) => (
            <span key={i} className="boom-bit" style={{ ['--a' as string]: `${i * 45}deg`, ['--d' as string]: `${90 + (i % 3) * 50}px` }}>{e}</span>
          ))}
        </div>
      )}
      {on('scrollRail') && !reduced() && (
        <nav className="rail" aria-label={lang === 'en' ? 'Page progress' : 'ページの進み具合'}>
          <span className="rail-track" aria-hidden="true" />
          {stops.map((st) => (
            <a key={st.id} className="rail-stop" href={'#' + st.id} style={{ top: `${st.at * 100}%` }}>
              <span>{st.id}</span>
            </a>
          ))}
          <span className="rail-rocket" style={{ top: `${progress * 100}%` }} aria-hidden="true">🚀<small>{pct}%</small></span>
        </nav>
      )}
      {cena > 0 && (
        <div className={cena < 3 ? 'cena' : 'cena cena-steady'} role="dialog" onPointerMove={(e) => {
          const x = cenaX.current
          if (!x || cena < 3 || performance.now() - cenaShownAt.current > 40000) return
          const r = x.getBoundingClientRect()
          if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > 160) return
          const m = 28
          let nx = 0, ny = 0
          for (let k = 0; k < 8; k++) {
            nx = m + Math.random() * (innerWidth - 2 * m - 48); ny = m + Math.random() * (innerHeight - 2 * m - 48)
            if (Math.hypot(e.clientX - nx, e.clientY - ny) > 260) break
          }
          setCenaPos({ x: nx, y: ny }); sayTaunt(nx, ny)
        }} aria-label={lang === 'en' ? 'And his name is John Cena' : 'そして彼の名は、ジョン・シーナ'}>
          <p className="cena-a" aria-hidden="true">{lang === 'en' ? 'AND HIS NAME IS' : 'そして彼の名は'}</p>
          {cena > 1 && <p className="cena-b" aria-hidden="true">JOHN CENA</p>}
          {cena > 2 && (
            <iframe className="cena-video" title={lang === 'en' ? 'Entrance theme' : '入場テーマ'}
              src="https://www.youtube-nocookie.com/embed/_1CC4DWJvcQ?autoplay=1&rel=0&playsinline=1"
              allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          )}
          {cena > 2 && (
            <button ref={cenaX} className="btn cena-x" autoFocus aria-label={lang === 'en' ? 'Close' : '閉じる'}
              style={cenaPos ? { left: cenaPos.x, top: cenaPos.y, right: 'auto' } : undefined}
              onClick={() => { setCena(0); setCenaPos(null); sched.current?.end('cena') }}><X size={22} aria-hidden="true" /></button>
          )}
        </div>
      )}
      {taunt && <span key={taunt.id} className={taunt.x > 220 ? 'x-taunt left' : 'x-taunt'} style={{ left: taunt.x + (taunt.x > 220 ? -12 : 60), top: taunt.y + 6 }} aria-hidden="true">{taunt.text}</span>}
      {omae > 0 && (
        <div className="omae" role="status" aria-label={lang === 'en' ? 'You are already dead. What?!' : 'お前はもう死んでいる。なに？！'}>
          <div className="omae-bar" aria-hidden="true" />
          <p className="omae-line" aria-hidden="true">{lang === 'en' ? 'You are already dead.' : 'お前はもう死んでいる'}</p>
          {omae > 1 && <p className="omae-nani" aria-hidden="true">{lang === 'en' ? 'WHAT?!' : 'なに？！'}</p>}
          <div className="omae-bar" aria-hidden="true" />
        </div>
      )}
      {rick && (
        <div className="rick" role="dialog" aria-modal="true" aria-label={lang === 'en' ? 'A short interruption' : '少しだけ中断'}
          onPointerMove={(e) => {
            const x = xBtn.current
            if (!x || performance.now() - rickOpenedAt.current > 40000) return
            const r = x.getBoundingClientRect()
            if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > 160) return
            xDodges.current++
            const m = 28
            let nx = 0, ny = 0
            for (let k = 0; k < 8; k++) { // pick a spot that is not near the cursor
              nx = m + Math.random() * (innerWidth - 2 * m - 48); ny = m + Math.random() * (innerHeight - 2 * m - 48)
              if (Math.hypot(e.clientX - nx, e.clientY - ny) > 260) break
            }
            setXPos({ x: nx, y: ny }); sayTaunt(nx, ny)
          }}>
          <button ref={xBtn} className="btn rick-x" aria-label={lang === 'en' ? 'Close' : '閉じる'}
            style={xPos ? { left: xPos.x, top: xPos.y, right: 'auto' } : undefined}
            onClick={() => { setRick(false); setXPos(null); xDodges.current = 0; sched.current?.end('rick') }}>
            <X size={22} aria-hidden="true" />
          </button>
          <div className="rick-box">
            <iframe className="rick-video" title={lang === 'en' ? 'Never Gonna Give You Up' : '定番の一曲'}
              src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1"
              allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          </div>
        </div>
      )}
      {on('moon') && !pile && !restoring && moonCount < 3 && (
        <button className="moon" onClick={press} aria-label={lang === 'en' ? 'Do not press (moon)' : '押さないで（月）'}>
          🌙 <span>{lang === 'en' ? 'Do not press' : '押さないで'}</span>
        </button>
      )}
      {pile && noteUp && (
        <div className={pileStage === 1 ? 'pile-note angry' : 'pile-note'} role="alertdialog" aria-label={lang === 'en' ? 'A message from the page' : 'ページからのメッセージ'}>
          <p>{PILE_NOTES[pileStage][lang]}</p>
          <button className="btn pile-x" autoFocus onClick={restore} aria-label={lang === 'en' ? 'Close and put everything back' : '閉じて元に戻す'}><X size={20} aria-hidden="true" /></button>
        </div>
      )}
      <MuteButton lang={lang} />
      {ach.length > 0 && (
        <div className="ach">
          <button className="btn" aria-expanded={achOpen} onClick={() => setAchOpen((o) => !o)}>
            {lang === 'en' ? 'Achievements' : '実績'} {ach.length}/{Object.keys(ACH).length}
          </button>
          {achOpen && <ul>{ach.map((a) => <li key={a}>{ACH[a][lang]}</li>)}</ul>}
        </div>
      )}
      <div ref={dock} className={anger > 6 ? 'scout-dock mad' : 'scout-dock'} aria-hidden="true" onClick={poke} style={{ ['--anger' as string]: anger / MAD.length }}>
        {bubble && <span className="bubble">{bubble}</span>}
        {nap && <span className="zzz">Zzz</span>}
        <Scout size={84} />
      </div>
      {stamps.map((s) => <span key={s.id} className="stamp" style={{ left: s.x, top: s.y }} aria-hidden="true">{s.text}</span>)}
      {toast && (
        <div className="toast" role="status" onClick={() => { setToast(null); sched.current?.noteDismiss() }}>
          <span>{toast}</span>
          <button className="toast-x" onClick={(e) => { e.stopPropagation(); setToast(null); sched.current?.noteDismiss() }} aria-label={lang === 'en' ? 'Close comment' : 'コメントを閉じる'}><X size={16} aria-hidden="true" /></button>
        </div>
      )}
      {cookie && !pile && !restoring && (
        <div className="cookie" role="dialog" aria-label="cookies">
          <span>{caption('g14', lang) ?? ''} <span className={`cookie-pic bites-${bites}`} aria-hidden="true">🍪</span></span>
          <button className="btn" onClick={() => { closeCookie(); cookieStorm() }}>
            {lang === 'en' ? 'Eat it' : '食べる'}
          </button>
        </div>
      )}
      {storm && (
        <div className="cookie-storm" aria-hidden="true">
          {storm.map((c) => <span key={c.id} style={{ ['--x' as string]: `${c.x}vw`, ['--y' as string]: `${c.y}vh`, ['--s' as string]: `${c.s}px`, ['--r' as string]: `${c.r}deg`, ['--d' as string]: `${c.d}s`, ['--dl' as string]: `${c.dl}s` }}>🍪</span>)}
        </div>
      )}
      {finale && (
        <div className="finale" aria-hidden="true">
          <span>🚀</span><b>{lang === 'en' ? 'THANK YOU' : 'ありがとうございました'}</b>
        </div>
      )}
    </div>
  )
}

/**
 * Barrel roll: header, page and footer swing round the middle of the window together: a small wind-up the wrong way,
 * a fast full turn while the page shrinks and blurs, a small overshoot, then it lands. (Fixed things, like the robot and the buttons, stay put.)
 */
function spinPage(done: () => void) {
  const html = document.documentElement
  const els = ['.site-header', 'main', 'footer'].map((q) => document.querySelector<HTMLElement>(q)).filter((e): e is HTMLElement => !!e)
  html.classList.add('rolling')
  sfx('whoosh')
  const frames: Keyframe[] = [
    { offset: 0, transform: 'rotate(0deg) scale(1)', filter: 'blur(0px)', easing: 'cubic-bezier(.3, 0, .6, 1)' },
    { offset: 0.16, transform: 'rotate(-10deg) scale(0.97)', filter: 'blur(0px)', easing: 'cubic-bezier(.6, 0, .35, 1)' },
    { offset: 0.62, transform: 'rotate(375deg) scale(0.74)', filter: 'blur(2.5px)', easing: 'cubic-bezier(.3, 0, .3, 1)' },
    { offset: 0.8, transform: 'rotate(356deg) scale(0.98)', filter: 'blur(0.5px)', easing: 'cubic-bezier(.4, 0, .2, 1)' },
    { offset: 1, transform: 'rotate(360deg) scale(1)', filter: 'blur(0px)' },
  ]
  const anims = els.map((el) => {
    const r = el.getBoundingClientRect() // spin round the middle of the window, wherever the page is scrolled to
    el.style.transformOrigin = `${innerWidth / 2 - r.left}px ${innerHeight / 2 - r.top}px`
    return el.animate(frames, { duration: 1900 })
  })
  setTimeout(() => sfx('thud'), 1450)
  Promise.all(anims.map((a) => a.finished.catch(() => null))).then(() => {
    els.forEach((el) => { el.style.transformOrigin = '' })
    html.classList.remove('rolling')
    done()
  })
}

/**
 * G1: gravity breaks. Everything on the whole page (not just what is on screen) falls toward the bottom of the page
 * (dir 1) or up to the top (dir -1), and the page itself scrolls that way so you watch it all land. stop() puts everything back and scrolls home.
 */
function gravityCollapse(dir: 1 | -1 = 1): { stop: (slow?: boolean) => number } {
  const startY = scrollY
  // sections skip rendering while off screen (content-visibility); force them to lay out so every element can be measured
  document.documentElement.classList.add('all-visible')
  void document.body.offsetHeight
  // Atomic units fall as one piece (cards, figures, simulations, buttons, pictures); text blocks fall on their own.
  const ATOM = '.card, figure, .sim, .badge, .tag, .chip, .btn, button, img, canvas, svg, video, .open, summary, label, input, select, .brand, .stamp'
  const TEXT = 'h1, h2, h3, h4, p, li, dt, dd, figcaption, a, span, td, th, small, strong, em'
  const root = document.body
  const header = document.querySelector<HTMLElement>('.site-header')
  const savedHeader = header?.getAttribute('style') ?? null
  // the sticky header becomes an ordinary block at the current scroll position, so it can fall with everything else
  if (header) { header.style.position = 'absolute'; header.style.top = `${scrollY}px`; header.style.left = '0'; header.style.right = '0' }

  const units: HTMLElement[] = []
  const walk = (el: HTMLElement) => {
    if (el.closest('.chaos-layer, .stars, script, style, .skip') || el.hidden || el.getAttribute('aria-hidden') === 'true' && !el.matches(ATOM)) return
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return
    const r = el.getBoundingClientRect()
    if (el.matches(ATOM)) { if (r.width > 8 && r.height > 8 && r.width < innerWidth - 2) units.push(el); return }
    const kids = [...el.children] as HTMLElement[]
    const hasBlockKid = kids.some((k) => k.matches(TEXT) && getComputedStyle(k).display !== 'inline' || k.matches(ATOM) || k.children.length)
    if (el.matches(TEXT) && (!hasBlockKid || el.matches('p, li, h1, h2, h3, h4, dt, dd, figcaption'))) {
      if (r.width > 8 && r.height > 8 && r.width < innerWidth - 2 && (el.textContent ?? '').trim()) units.push(el)
      return
    }
    kids.forEach(walk)
  }
  walk(root)
  // keep the biggest if there are too many for the physics engine
  const picked = units.length > 420
    ? units.map((e) => ({ e, a: e.getBoundingClientRect().width * e.getBoundingClientRect().height })).sort((x, y) => y.a - x.a).slice(0, 420).map((x) => x.e)
    : units

  const { Engine, Bodies, Composite, Runner } = Matter
  const W = innerWidth, docH = document.documentElement.scrollHeight
  // a very long page needs stronger gravity, so even what starts at the top lands within a few seconds
  const engine = Engine.create({ gravity: { x: 0, y: 1.1 * dir * Math.min(3.2, Math.max(1, docH / 9000)) }, enableSleeping: true })
  const walls = [
    // a very thick floor (or ceiling), so fast bodies cannot tunnel through it
    Bodies.rectangle(W / 2, dir === 1 ? docH + 1500 : -1500, W * 2, 3000, { isStatic: true }),
    Bodies.rectangle(-40, docH / 2, 80, docH * 2, { isStatic: true }),
    Bodies.rectangle(W + 40, docH / 2, 80, docH * 2, { isStatic: true }),
  ]
  // measure everything first, then change styles (making inline things inline-block can shift neighbours)
  const rects = picked.map((el) => el.getBoundingClientRect())
  const items = picked.map((el, i) => {
    const r = rects[i]
    const cx = r.left + scrollX + r.width / 2, cy = r.top + scrollY + r.height / 2
    const body = Bodies.rectangle(cx, cy, r.width, r.height, { restitution: 0.2, friction: 0.7, sleepThreshold: 40 })
    return { el, body, cx, cy, saved: el.getAttribute('style') }
  })
  for (const i of items) {
    const cs = getComputedStyle(i.el)
    if (cs.display === 'inline') i.el.style.display = 'inline-block'
    i.el.style.transition = 'none'
    if (cs.position === 'static') i.el.style.position = 'relative'
    i.el.style.zIndex = '5'
  }
  Composite.add(engine.world, [...walls, ...items.map((i) => i.body)])
  let lastHit = 0
  Matter.Events.on(engine, 'collisionStart', (ev) => {
    const now = performance.now()
    if (now - lastHit < 55) return
    let best: (typeof ev.pairs)[number] | null = null, bestV = 0
    for (const p of ev.pairs) { const v = Math.max(p.bodyA.speed, p.bodyB.speed); if (v > bestV) { bestV = v; best = p } }
    if (!best || bestV < 1.5) return
    lastHit = now
    impact(Math.min(1, bestV / 16), best.bodyA.isStatic || best.bodyB.isStatic)
  })
  const prev = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  const runner = Runner.create()
  Runner.run(runner, engine)
  let raf = 0
  const t0 = performance.now()
  const target = dir === 1 ? Math.max(0, docH - innerHeight) : 0
  let lastAim = 0, aim = target
  const heapTarget = () => {
    // the window of the page that holds the most stuff (by area), so the viewport is never an empty stretch of sky
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight)
    const pts = items.map((i) => ({ y: i.body.position.y, a: Math.min(innerHeight, i.body.bounds.max.y - i.body.bounds.min.y) * Math.min(innerWidth, i.body.bounds.max.x - i.body.bounds.min.x) }))
    if (!pts.length) return target
    let best = -1, bestY = target
    for (let s0 = 0; s0 <= maxScroll; s0 += 120) {
      let sum = 0
      for (const q of pts) if (q.y > s0 - 60 && q.y < s0 + innerHeight + 60) sum += q.a
      if (sum > best * 1.02 || (dir === 1 && sum >= best)) { best = sum; bestY = s0 }
    }
    return bestY
  }
  const draw = () => {
    for (const i of items) {
      if (i.body.isSleeping) continue
      i.el.style.transform = `translate(${i.body.position.x - i.cx}px, ${i.body.position.y - i.cy}px) rotate(${i.body.angle}rad)`
    }
    // the page itself drops to the floor (or rises to the ceiling), slowly at first like something falling
    const u = Math.min(1, (performance.now() - t0) / 4200)
    // at the end, settle where the heap actually is (not just the bottom of the page), so the viewport is never an empty stretch
    if (u >= 1 && performance.now() - lastAim > 400) { lastAim = performance.now(); aim = heapTarget() }
    const end = u < 1 ? target : aim
    window.scrollTo({ top: startY + (end - startY) * u * u, behavior: 'instant' })
    raf = requestAnimationFrame(draw)
  }
  draw()
  return {
    stop(slow = false) {
      const ms = slow ? 9000 : 900 // "slowly" means slowly: everything drifts back over nine seconds
      cancelAnimationFrame(raf)
      Runner.stop(runner); Composite.clear(engine.world, false); Engine.clear(engine)
      for (const i of items) { i.el.style.transition = `transform ${ms}ms cubic-bezier(.45, 0, .3, 1)`; i.el.style.transform = 'none' }
      document.body.style.overflow = prev
      // glide back to where the visitor was, at the same pace; any wheel, touch or key press hands scrolling back to them
      const from = scrollY, t1 = performance.now()
      let scrolling = true
      const stopScroll = () => { scrolling = false }
      for (const ev of ['wheel', 'touchstart', 'keydown'] as const) addEventListener(ev, stopScroll, { once: true, passive: true })
      const glide = () => {
        if (!scrolling) return
        const u = Math.min(1, (performance.now() - t1) / ms)
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
        window.scrollTo({ top: from + (startY - from) * e, behavior: 'instant' })
        if (u < 1) requestAnimationFrame(glide)
      }
      glide()
      setTimeout(() => {
        for (const i of items) { if (i.saved === null) i.el.removeAttribute('style'); else i.el.setAttribute('style', i.saved) }
        if (header) { if (savedHeader === null) header.removeAttribute('style'); else header.setAttribute('style', savedHeader) }
        document.documentElement.classList.remove('all-visible')
      }, ms + 100)
      return ms
    },
  }
}
