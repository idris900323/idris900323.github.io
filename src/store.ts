import { create } from 'zustand'

export type Lang = 'en' | 'ja'
export type Mode = 'calm' | 'chaos'

type State = {
  lang: Lang
  mode: Mode
  setLang: (l: Lang) => void
  setMode: (m: Mode) => void
  toggleMode: () => void
  /** True after the pet robot threw the visitor out of Chaos mode; Calm shows a notice until dismissed. */
  evicted: boolean
  setEvicted: (v: boolean) => void
}

const initialLang = (): Lang => {
  try {
    const q = new URLSearchParams(location.search).get('lang')
    if (q === 'en' || q === 'ja') return q
    const s = localStorage.getItem('lang')
    if (s === 'en' || s === 'ja') return s
  } catch { /* storage can be blocked */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}

// Mode survives scrolling and language switches within a visit (sessionStorage) but ALWAYS starts Calm on a new visit.
const initialMode = (): Mode => 'calm'

const applyLang = (lang: Lang) => { document.documentElement.lang = lang }
const applyMode = (mode: Mode) => { document.documentElement.dataset.mode = mode }

export const useStore = create<State>((set, get) => ({
  lang: initialLang(),
  mode: initialMode(),
  setLang: (lang) => {
    try { localStorage.setItem('lang', lang) } catch { /* ignore */ }
    try {
      const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u)
    } catch { /* ignore */ }
    applyLang(lang)
    set({ lang })
  },
  setMode: (mode) => { applyMode(mode); set({ mode }) },
  toggleMode: () => get().setMode(get().mode === 'calm' ? 'chaos' : 'calm'),
  evicted: false,
  setEvicted: (evicted) => set({ evicted }),
}))

applyLang(useStore.getState().lang)
