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

  const insert = (i) => {
    if (i === loaded && !booting) return
    clearTimeout(timer.current)
    clunk()
    setLoaded(i)
    setBooting(true)
    timer.current = setTimeout(() => { setBooting(false); bootChime() }, 900)
  }
  const eject = () => { clearTimeout(timer.current); press(); setLoaded(null); setBooting(false) }
  const flip = (dir) => { press(); insert(((loaded ?? -1) + dir + projects.length) % projects.length) }

  const open = (href) => { press(); if (href) window.open(href, '_blank', 'noopener') }

  // Dragging a cartridge: if it is let go over the slot, it goes in; a plain click inserts it too
  const down = (i) => (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { i, x0: e.clientX, y0: e.clientY, moved: false }
    setDrag({ i, x: 0, y: 0 })
  }
  const move = (e) => {
    const s = start.current
    if (!s) return
    const x = e.clientX - s.x0
    const y = e.clientY - s.y0
    if (Math.hypot(x, y) > 6) s.moved = true
    setDrag({ i: s.i, x, y })
  }
  const up = (e) => {
    const s = start.current
    start.current = null
    setDrag(null)
    if (!s) return
    if (!s.moved) return insert(s.i)
    const r = slot.current.getBoundingClientRect()
    const over = e.clientX > r.left - 40 && e.clientX < r.right + 40 && e.clientY > r.top - 80 && e.clientY < r.bottom + 120
    if (over) insert(s.i)
  }

  const p = loaded == null ? null : projects[loaded]

  return (
    <div className="carts">
      <div className="cart-rack">
        {projects.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`cart ${loaded === i ? 'is-in' : ''} ${drag?.i === i ? 'is-dragging' : ''}`}
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
          {p ? <span className="slot-cart" style={{ '--c': p.color }} /> : <span>INSERT CARTRIDGE</span>}
        </div>
        <div className="console-screen">
          {!p && <p className="screen-idle">NO CARTRIDGE<br /><span>pick a project from the rack</span></p>}
          {p && booting && <p className="screen-boot">LOADING<span className="dots">…</span></p>}
          {p && !booting && (
            <div className="screen-game" key={loaded}>
              <div className="screen-shot" style={{ '--c': p.color }}>
                {p.image ? <img src={p.image} alt={`${p.title} screenshot`} draggable="false" /> : <span>screenshot coming soon</span>}
              </div>
              <h3>{p.title}</h3>
              <p>{p.blurb}</p>
              <div className="screen-tech">{p.tech.map((t) => <span key={t}>{t}</span>)}</div>
              <p className="screen-keys">A ▶ {p.live ? 'PLAY (live site)' : 'no live site yet'} · B {'{ }'} {p.code ? 'CODE' : 'no code link'}</p>
            </div>
          )}
        </div>
        <div className="console-pad">
          <div className="dpad" role="group" aria-label="Switch cartridge">
            <button type="button" className="dpad-l" onClick={() => flip(-1)} aria-label="Previous project" />
            <button type="button" className="dpad-r" onClick={() => flip(1)} aria-label="Next project" />
            <span className="dpad-v" aria-hidden="true" />
          </div>
          <button type="button" className="console-eject" onClick={eject} disabled={!p}>EJECT</button>
          <div className="ab">
            <button type="button" className="btn-b" onClick={() => open(p?.code)} disabled={!p?.code || booting} aria-label="B: open the code">B</button>
            <button type="button" className="btn-a" onClick={() => open(p?.live)} disabled={!p?.live || booting} aria-label="A: open the live site">A</button>
          </div>
        </div>
      </div>
    </div>
  )
}
