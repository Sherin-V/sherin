import { useEffect, useRef, useState } from 'react'
import { FORM_URL } from './data.js'
import { bonk, keyUp, roger, stopStatic } from './radioSounds.js'

// Contact as a toy walkie-talkie: fill in the screen, then press and hold PUSH TO TALK.
// Hold until the ring fills, let go, and the message goes out. Over and out.
const HOLD_MS = 800
const okEmail = (v) => /^\S+@\S+\.\S+$/.test(v)

export default function WalkieContact({ children }) {
  const [fields, setFields] = useState({ names: '', email: '', message: '', website: '' })
  const [error, setError] = useState('')
  const [phase, setPhase] = useState('idle') // idle | talking | sending | sent | failed | busy
  const [held, setHeld] = useState(0) // 0..1 how long the button has been held
  const hold = useRef({ on: false, start: 0, raf: 0 })
  const fieldsRef = useRef(fields)
  fieldsRef.current = fields

  const set = (k) => (e) => { setFields((f) => ({ ...f, [k]: e.target.value })); setError('') }

  const check = () => {
    const f = fieldsRef.current
    if (!f.names.trim()) return 'NO CALLSIGN — TYPE YOUR NAME'
    if (!okEmail(f.email.trim())) return 'REPLY-TO EMAIL LOOKS WRONG'
    if (!f.message.trim()) return 'NOTHING TO SAY YET'
    return ''
  }

  // The script answers { ok: true } or { ok: false, error }, so the walkie shows what really happened
  const send = async () => {
    setPhase('sending')
    try {
      const body = new URLSearchParams({ ...fieldsRef.current, page: location.href, subject: 'Walkie-talkie message from sherin.fun' })
      const res = await fetch(FORM_URL, { method: 'POST', body })
      const answer = await res.json().catch(() => ({ ok: res.ok }))
      setPhase(answer.ok ? 'sent' : answer.error === 'too-many' ? 'busy' : 'failed')
    } catch {
      setPhase('failed')
    }
  }

  const start = (e) => {
    if (phase === 'sending' || phase === 'sent') return
    const problem = check()
    if (problem) { setError(problem); bonk(); return }
    e?.currentTarget?.setPointerCapture?.(e.pointerId)
    hold.current = { on: true, start: performance.now(), raf: 0 }
    keyUp()
    setPhase('talking')
    const tick = () => {
      if (!hold.current.on) return
      setHeld(Math.min(1, (performance.now() - hold.current.start) / HOLD_MS))
      hold.current.raf = requestAnimationFrame(tick)
    }
    tick()
  }

  const stop = () => {
    if (!hold.current.on) return
    hold.current.on = false
    cancelAnimationFrame(hold.current.raf)
    const long = performance.now() - hold.current.start >= HOLD_MS
    setHeld(0)
    if (long) { roger(); send() }
    else { bonk(); setPhase('idle'); setError('HOLD IT A BIT LONGER…') }
  }

  // Space bar works like the button while it has focus
  const onKeyDown = (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start() } }
  const onKeyUp = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop() } }
  useEffect(() => () => { cancelAnimationFrame(hold.current.raf); stopStatic() }, [])

  const again = () => { setFields({ names: '', email: '', message: '', website: '' }); setPhase('idle'); setError('') }
  const talking = phase === 'talking'
  const locked = phase === 'sending' || phase === 'sent'

  const status = {
    idle: error || 'READY · CH 04',
    talking: 'TRANSMITTING…',
    sending: 'KSHHH… SENDING',
    sent: '…OVER AND OUT ✓',
    failed: 'NO SIGNAL — EMAIL ME DIRECTLY',
    busy: 'CHANNEL BUSY — TRY AGAIN SOON',
  }[phase]

  return (
    <div className="walkie-wrap">
      <div className="walkie-left">{children}</div>

      <div className={`walkie ${talking ? 'is-talking' : ''} ${phase === 'sent' ? 'is-sent' : ''}`}>
        <span className="walkie-antenna" aria-hidden="true" />
        <span className="walkie-knob" aria-hidden="true"><i /></span>
        <div className="walkie-top">
          <span className={`walkie-led ${talking ? 'on' : ''} ${phase === 'sent' ? 'ok' : ''}`} aria-hidden="true" />
          <span className="walkie-brand">SHERIN · FUN</span>
          <span className="walkie-bars" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} style={{ '--i': i }} />)}</span>
        </div>
        <div className="walkie-grille" aria-hidden="true" />

        <form className="walkie-screen" noValidate onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>CALLSIGN</span>
            <input name="names" autoComplete="name" value={fields.names} onChange={set('names')} disabled={locked} placeholder="your name" />
          </label>
          <label>
            <span>REPLY TO</span>
            <input name="email" type="email" autoComplete="email" value={fields.email} onChange={set('email')} disabled={locked} placeholder="your email" />
          </label>
          <label className="walkie-msg">
            <span>MESSAGE</span>
            <textarea name="message" rows="3" value={fields.message} onChange={set('message')} disabled={locked} placeholder="what should we build?" />
          </label>
          {/* Spam trap: hidden from people, but bots fill in every field they find */}
          <input className="walkie-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={fields.website} onChange={set('website')} />
          <p className={`walkie-status ${error && phase === 'idle' ? 'warn' : ''}`} role="status" aria-live="polite">{status}</p>
        </form>

        <div className="walkie-controls">
          <button
            type="button"
            className="ptt"
            style={{ '--held': held }}
            onPointerDown={start}
            onPointerUp={stop}
            onPointerCancel={stop}
            onPointerLeave={stop}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            disabled={locked}
            aria-label="Push to talk: press and hold to send your message"
          >
            <span className="ptt-ring" aria-hidden="true" />
            <span className="ptt-label">{phase === 'sent' ? 'SENT' : talking ? 'TALKING' : 'PUSH TO TALK'}</span>
          </button>
          <p className="walkie-hint">{phase === 'sent' ? 'thanks! I’ll reply soon' : 'hold until the ring fills, then let go'}</p>
          {phase === 'sent' && <button type="button" className="walkie-again" onClick={again}>send another</button>}
        </div>
        <span className="walkie-waves" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  )
}
