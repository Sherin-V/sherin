import { useRef, useState } from 'react'
import { projects } from './data.js'
import { bootChime, clunk, press } from './toySounds.js'

// Projects as game cartridges: drag one into the console (or just click it) and it boots up.
// A opens the live site, B opens the code, the d-pad flips between cartridges.
const INK = (c) => (c === '#ffc531' || c === '#a9b6ff' || c === '#f2ede4' ? '#141312' : '#f2ede4')

export default function ProjectConsole() {
  const slot = useRef(null)
  const [loaded, setLoaded] = useState(null) // index of the cartridge in the console
  const [booting, setBooting] = useState(false)
  const [drag, setDrag] = useState(null) // { i, x, y } while a cartridge is being dragged
  const start = useRef(null)
  const timer = useRef(0)
  const flying = useRef(false)
  const carts = useRef([]) // the cartridge buttons in the rack
  const [flyingI, setFlyingI] = useState(null)

  const insert = (i) => {
    if (i === loaded && !booting) return
    clearTimeout(timer.current)
    clunk()
    setLoaded(i)
    setBooting(true)
    timer.current = setTimeout(() => { setBooting(false); bootChime() }, 900)
  }
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // The cartridge travels to the console: it lifts off the rack, arcs over to the slot,
  // lines up above it and slides down in. Only then does it boot. If another cartridge is
  // already in, that one is ejected back to the rack first.
  const fly = async (i, el, from = { x: 0, y: 0 }) => {
    if (flying.current || (i === loaded && !booting)) return
    if (reduced() || !el.animate) return insert(i)
    flying.current = true
    if (loaded != null && loaded !== i) {
      clearTimeout(timer.current)
      press()
      setFlyingI(loaded)
      await ejectFlight(loaded)
      from = { x: 0, y: 0 } // the new cartridge starts from its spot in the rack
    }
    setFlyingI(i)
    // Phones: the console sits below the rack, so bring the slot into view first
    const sr = slot.current.getBoundingClientRect()
    if (sr.top < 70 || sr.bottom > window.innerHeight - 40) {
      window.scrollBy({ top: sr.top - window.innerHeight * 0.45, behavior: 'smooth' })
      setTimeout(() => launch(i, el, from), 520)
    } else launch(i, el, from)
  }
  const launch = (i, el, from) => {
    const { dx, scale, above, inside } = path(el, from)
    const lift = Math.min(from.y, 0) - 70
    const anim = el.animate([
      { transform: `translate(${from.x}px, ${from.y}px) rotate(-4deg)` },
      { transform: `translate(${from.x}px, ${from.y - 26}px) rotate(-8deg)`, offset: 0.12 },
      { transform: `translate(${dx * 0.55}px, ${lift}px) rotate(-12deg) scale(${(1 + scale) / 2})`, offset: 0.45 },
      { transform: `translate(${dx}px, ${above}px) rotate(0deg) scale(${scale})`, opacity: 1, offset: 0.78 },
      { transform: `translate(${dx}px, ${inside}px) rotate(0deg) scale(${scale})`, opacity: 0 },
    ], { duration: 1100, easing: 'cubic-bezier(.45, .05, .35, 1)', fill: 'forwards' })
    anim.finished.then(() => {
      insert(i)
      anim.cancel()
      flying.current = false
      setFlyingI(null)
    })
  }
  // The trip between a cartridge's spot in the rack and the console slot
  const path = (el, from = { x: 0, y: 0 }) => {
    const r = el.getBoundingClientRect()
    const s = slot.current.getBoundingClientRect()
    // where the cartridge sits in the rack, without any drag offset
    const cx = r.left + r.width / 2 - from.x
    const cy = r.top + r.height / 2 - from.y
    const dx = s.left + s.width / 2 - cx
    const scale = Math.min(0.62, (s.width * 0.55) / r.width)
    const above = s.top - (r.height * scale) / 2 - 10 - cy // centre of the cartridge just above the slot
    const inside = s.top + s.height - (r.height * scale) / 2 - cy // bottom edge level with the slot floor
    return { dx, scale, above, inside }
  }
  // Out of the slot and back to its spot in the rack (it is hidden from the rack while inside,
  // so wait a frame for it to be laid out again before measuring)
  const ejectFlight = (i) => new Promise((done) => {
    const el = carts.current[i]
    setLoaded(null)
    setBooting(false)
    if (!el || reduced() || !el.animate) return done()
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const { dx, scale, above, inside } = path(el)
      const anim = el.animate([
        { transform: `translate(${dx}px, ${inside}px) rotate(0deg) scale(${scale})`, opacity: 0 },
        { transform: `translate(${dx}px, ${above - 30}px) rotate(0deg) scale(${scale})`, opacity: 1, offset: 0.25 },
        { transform: `translate(${dx * 0.5}px, -70px) rotate(10deg) scale(${(1 + scale) / 2})`, offset: 0.6 },
        { transform: 'translate(0px, -18px) rotate(-3deg)', offset: 0.85 },
        { transform: 'translate(0px, 0px) rotate(0deg)' },
      ], { duration: 1000, easing: 'cubic-bezier(.3, .6, .35, 1)', fill: 'forwards' })
      anim.finished.then(() => { anim.cancel(); done() })
    }))
  })
  // EJECT button
  const eject = () => {
    if (loaded == null || flying.current) return
    clearTimeout(timer.current)
    press()
    flying.current = true
    setFlyingI(loaded)
    ejectFlight(loaded).then(() => {
      flying.current = false
      setFlyingI(null)
    })
  }
  // D-pad: swap to the previous or next cartridge, with the same eject and insert
  const flip = (dir) => {
    if (flying.current) return
    press()
    const n = ((loaded ?? -1) + dir + projects.length) % projects.length
    fly(n, carts.current[n])
  }

  const open = (href) => { press(); if (href) window.open(href, '_blank', 'noopener') }

  // Dragging a cartridge: if it is let go over the slot, it goes in; a plain click inserts it too
  const down = (i) => (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    if (flying.current) return
    start.current = { i, x0: e.clientX, y0: e.clientY, moved: false, x: 0, y: 0 }
    setDrag({ i, x: 0, y: 0 })
  }
  const move = (e) => {
    const s = start.current
    if (!s) return
    const x = e.clientX - s.x0
    const y = e.clientY - s.y0
    if (Math.hypot(x, y) > 6) s.moved = true
    s.x = x
    s.y = y
    setDrag({ i: s.i, x, y })
  }
  const up = (e) => {
    const s = start.current
    start.current = null
    setDrag(null)
    if (!s) return
    const el = e.currentTarget
    if (!s.moved) return fly(s.i, el)
    const r = slot.current.getBoundingClientRect()
    const over = e.clientX > r.left - 40 && e.clientX < r.right + 40 && e.clientY > r.top - 80 && e.clientY < r.bottom + 120
    if (over) fly(s.i, el, { x: s.x, y: s.y })
  }

  const p = loaded == null ? null : projects[loaded]

  return (
    <div className="carts">
      <div className="cart-rack">
        {projects.map((c, i) => (
          <button
            key={i}
            ref={(el) => { carts.current[i] = el }}
            type="button"
            className={`cart ${loaded === i ? 'is-in' : ''} ${drag?.i === i ? 'is-dragging' : ''} ${flyingI === i ? 'is-flying' : ''}`}
            style={{ '--c': c.color, '--ink': INK(c.color), transform: drag?.i === i ? `translate(${drag.x}px, ${drag.y}px) rotate(-4deg)` : undefined }}
            onPointerDown={down(i)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-label={`Insert ${c.title}`}
          >
            <span className="cart-grip" aria-hidden="true" />
            <span className="cart-label">
              <small>No. {String(i + 1).padStart(2, '0')}</small>
              {c.title}
            </span>
          </button>
        ))}
        <p className="cart-hint">drag one into the console, or just click it →</p>
      </div>

      <div className="console">
        <div className={`console-slot ${p ? 'full' : ''}`} ref={slot}>
          {p ? <span className="slot-cart" style={{ '--c': p.color }} /> : <span className="sr-only">Insert cartridge</span>}
        </div>
        <div className="console-screen">
          {/* Every screen (idle, loading and each game) shares one spot, so the screen keeps the
              size of its biggest state and never grows or shrinks, like a real console */}
          <p className={`screen-idle ${p ? '' : 'on'}`}>NO CARTRIDGE<br /><span>pick a project from the rack</span></p>
          <p className={`screen-boot ${p && booting ? 'on' : ''}`}>LOADING<span className="dots">…</span></p>
          {projects.map((q, k) => (
            <div key={k} className={`screen-game ${p && !booting && loaded === k ? 'on' : ''}`}>
              <div className="screen-shot" style={{ '--c': q.color }}>
                {q.image ? <img src={q.image} alt={`${q.title} by Sherin Varghese, screenshot`} draggable="false" /> : <span>screenshot coming soon</span>}
              </div>
              <h3>{q.title}</h3>
              <p>{q.blurb}</p>
              <div className="screen-tech">{q.tech.map((t) => <span key={t}>{t}</span>)}</div>
              <div className="screen-links">
                {q.live && (
                  <a href={q.live} target="_blank" rel="noopener noreferrer" onClick={press}>
                    {q.icon && <img className="link-icon" src={q.icon} alt="" draggable="false" />}
                    {q.live.replace(/^https:\/\/(www\.)?/, '')}
                  </a>
                )}
                {q.code && (
                  <a href={q.code} target="_blank" rel="noopener noreferrer" onClick={press}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" /></svg>
                    {q.code.replace(/^https:\/\//, '')}
                  </a>
                )}
              </div>
              <p className="screen-keys">A ▶ {q.live ? (q.liveLabel || 'LIVE SITE') : 'no live site yet'} · B ▶ {q.code ? 'GITHUB' : 'no code link'}</p>
            </div>
          ))}
        </div>
        <div className="console-pad">
          <div className="dpad" role="group" aria-label="Switch cartridge">
            <button type="button" className="dpad-l" onClick={() => flip(-1)} aria-label="Previous project" />
            <button type="button" className="dpad-r" onClick={() => flip(1)} aria-label="Next project" />
            <span className="dpad-v" aria-hidden="true" />
          </div>
          <button type="button" className="console-eject" onClick={eject} disabled={!p}>EJECT</button>
          <div className="ab">
            <button type="button" className="btn-b" onClick={() => open(p?.code)} disabled={!p?.code || booting} aria-label="B: open on GitHub">B</button>
            <button type="button" className="btn-a" onClick={() => open(p?.live)} disabled={!p?.live || booting} aria-label={`A: open the ${p?.liveLabel ? p.liveLabel.toLowerCase() : 'live site'}`}>A</button>
          </div>
        </div>
      </div>
    </div>
  )
}
