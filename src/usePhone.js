import { useEffect, useState } from 'react'

// True on phone-sized screens. Heavier toys (live physics, drag-to-play) switch to lighter
// versions there, because touch dragging fights with page scrolling and phones have less power.
const QUERY = '(max-width: 760px)'

export function isPhone() {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches
}

export function usePhone() {
  const [phone, setPhone] = useState(isPhone)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}
