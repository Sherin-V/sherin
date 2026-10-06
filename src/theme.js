import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

// Light or dark sand. The choice lives on <html data-theme>, set before first paint in index.html.
const read = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

function apply(theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('theme', theme) } catch {}
  // Re-render synchronously so the circle spread snapshots the finished new theme
  flushSync(() => window.dispatchEvent(new Event('themechange')))
}

// Switch theme with the new colours spreading out in a circle from (x, y), where the toggle is
export function setTheme(theme, x = innerWidth / 2, y = 0) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduce) return apply(theme)
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const t = document.startViewTransition(() => apply(theme))
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' },
    )
  }).catch(() => {}) // a quick second click skips the animation; the theme still switches
}

export function useTheme() {
  const [theme, set] = useState(read)
  useEffect(() => {
    const on = () => set(read())
    window.addEventListener('themechange', on)
    return () => window.removeEventListener('themechange', on)
  }, [])
  return theme
}

// Page tone from top to bottom of the page; it warms toward caramel as you scroll in both themes
// (light: cream to caramel, dark: espresso to dark caramel, still dark enough for light text)
export const TONES = {
  light: ['#f2ede4', '#e9dcc6', '#dfc8a5', '#d4b385', '#c79d66'],
  dark: ['#2b251e', '#33291e', '#3c2d1d', '#45311c', '#4e351b'],
}
