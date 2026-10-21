import { Component, type ReactNode } from 'react'
import { useStore } from '../store'

/** If anything in Chaos throws, undo whatever the gags changed and fall back to Calm, so the visitor is never left on a blank page. */
function undoChaosSideEffects() {
  const h = document.documentElement
  h.classList.remove('all-visible', 'shake')
  document.body.style.overflow = ''
  document.querySelector<HTMLElement>('.site-header')?.removeAttribute('style')
  document.querySelectorAll<HTMLElement>('[style*="will-change"], [style*="transform"]').forEach((e) => {
    if (e.closest('.chaos-layer')) return
    e.style.transform = ''; e.style.transition = ''; e.style.willChange = ''; e.style.zIndex = ''
  })
}

export default class ChaosGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) {
    console.error('Chaos mode crashed; returning to Calm.', err)
    undoChaosSideEffects()
    useStore.getState().setMode('calm')
  }
  render() { return this.state.failed ? null : this.props.children }
}
