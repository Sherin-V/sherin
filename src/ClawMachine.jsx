import { useEffect, useMemo, useRef, useState } from 'react'
import { journey } from './data.js'

// The Journey as an arcade claw machine: each milestone is a capsule in the pile. Move the claw,
// press DROP, and if it holds on, the capsule goes down the chute and prints a prize ticket.
// Sometimes it just slips.
const CAPSULE = 62
const COLORS = ['#ff5a36', '#3d5afe', '#ffc531', '#141312', '#a9b6ff', '#ff8a6b']
const FILLER = ['#ffc531', '#a9b6ff', '#ff8a6b', '#3d5afe', '#ff5a36', '#f2ede4', '#141312']
const GRIP = 0.7 // chance the claw holds on when it is right above a capsule
const REACH = 36 // px: how close the claw must be to a capsule's centre to grab it
const CHUTE_W = 82
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const MESSAGES = {
  idle: 'move the claw, then press DROP',
  dropping: 'here it goes…',
  miss: 'oops, you missed it — try again!',
  slip: 'oops, it slipped! try again!',
  win: 'got it! ✓ check your ticket',
  done: 'you won them all! 🎉',
}

export default function ClawMachine() {
  const glass = useRef(null)
  const [width, setWidth] = useState(560)
  const [clawX, setClawX] = useState(90)
  const [lean, setLean] = useState(0) // joystick tilt, follows claw movement
  const [drop, setDrop] = useState(false)
  const [closed, setClosed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [held, setHeld] = useState(null)
  const [wobble, setWobble] = useState(null)
  const [won, setWon] = useState([])
  const [latest, setLatest] = useState(null)
  const [msg, setMsg] = useState('idle')
  const [showList, setShowList] = useState(false)
  const [steering, setSteering] = useState(false) // joystick in hand: claw follows it directly, no glide

  useEffect(() => {
    const el = glass.current
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Milestone capsules sit along the front of the pile, spread across the floor
  const capsules = useMemo(() => journey.map((j, i) => {
    const usable = width - CAPSULE - CHUTE_W - 40
    const step = journey.length > 1 ? usable / (journey.length - 1) : 0
    return { ...j, i, num: i + 1, color: j.color ?? COLORS[i % COLORS.length], x: 18 + i * step, lift: (i % 2) * 18, tilt: ((i * 37) % 36) - 18 }
  }), [width])

  // Decorative capsules behind them so the machine looks full (not grabbable): two even rows
  const filler = useMemo(() => {
    const out = []
    const span = width - CHUTE_W - 24
    for (let row = 0; row < 2; row++) {
      const size = row ? 46 : 52
      const n = Math.max(1, Math.floor(span / (size + 4)))
      const step = span / n
      for (let j = 0; j < n; j++) {
        const k = row * 31 + j
        out.push({ x: 8 + j * step + (row ? step / 2 : 0) - (row ? size / 2 : 0), b: row ? 40 : 4, size, color: FILLER[(k * 3) % FILLER.length], tilt: (k * 47) % 360 })
      }
    }
    return out.filter((f) => f.x > 2 && f.x + f.size < span + 10)
  }, [width])

  const chuteX = width - CHUTE_W - 6
  const clamp = (x) => Math.min(Math.max(x, 26), chuteX - 10)

  const moveTo = (x) => {
    const nx = clamp(x)
    setLean(Math.sign(nx - clawX) * 18)
    setClawX(nx)
  }
  useEffect(() => {
    if (stick.current.held) return
    const t = setTimeout(() => setLean(0), 220)
    return () => clearTimeout(t)
  }, [clawX])

  // The joystick: push the ball left or right and the claw slides that way, faster the further
  // you push. Let go and it springs back to the middle.
  const stick = useRef({ held: false, v: 0, cx: 0 })
  const stickMove = (e) => {
    const st = stick.current
    if (!st.held) return
    const dx = Math.min(Math.max(e.clientX - st.cx, -26), 26)
    setLean((dx / 26) * 34)
    // Gentle near the middle, faster only at full tilt (easier to aim)
    const t = Math.abs(dx / 26)
    st.v = Math.sign(dx) * Math.pow(t, 1.8) * 200 // px per second at full tilt
  }
  const stickDown = (e) => {
    if (busy) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const r = e.currentTarget.getBoundingClientRect()
    stick.current = { held: true, v: 0, cx: r.left + r.width / 2 }
    setSteering(true)
    stickMove(e)
  }
  // Aim assist: on letting go, glide onto the nearest capsule if it's close
  const nearest = (x, within) => capsules
    .filter((c) => !won.includes(c.i))
    .map((c) => ({ x: c.x + CAPSULE / 2, d: Math.abs(c.x + CAPSULE / 2 - x) }))
    .filter((c) => c.d < within)
    .sort((a, b) => a.d - b.d)[0]
  const stickUp = () => {
    if (!stick.current.held) return
    stick.current.held = false
    stick.current.v = 0
    setLean(0)
    setSteering(false)
    const snap = nearest(clawX, 60)
    if (snap) setClawX(clamp(snap.x))
  }
  useEffect(() => {
    let raf
    let prev = performance.now()
    const tick = (now) => {
      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      const { held, v } = stick.current
      if (held && v && !busy) setClawX((x) => clamp(x + v * dt))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [busy, width])

  const follow = (e) => {
    if (busy) return
    const r = glass.current.getBoundingClientRect()
    moveTo(e.clientX - r.left)
  }

  const play = async () => {
    if (busy) return
    setBusy(true)
    setMsg('dropping')
    setDrop(true)
    await wait(720)
    setClosed(true)
    await wait(260)

    const left = capsules.filter((c) => !won.includes(c.i))
    const under = left.reduce((best, c) => {
      const d = Math.abs(c.x + CAPSULE / 2 - clawX)
      return d < REACH && (!best || d < best.d) ? { c, d } : best
    }, null)
    const holds = under && Math.random() < GRIP

    if (holds) {
      setHeld(under.c.i)
      setDrop(false)
      await wait(720)
      setClawX(chuteX + CHUTE_W / 2 - 4)
      await wait(650)
      setClosed(false)
      setHeld(null)
      const nextWon = [...won, under.c.i]
      setWon(nextWon)
      setLatest(under.c.i)
      setMsg(nextWon.length === capsules.length ? 'done' : 'win')
      await wait(300)
      setClawX((x) => clamp(x - CHUTE_W))
    } else {
      if (under) setWobble(under.c.i)
      setDrop(false)
      await wait(360)
      setWobble(null)
      await wait(360)
      setClosed(false)
      setMsg(under ? 'slip' : 'miss')
    }
    setBusy(false)
  }

  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); if (!busy) moveTo(clawX - 30) }
    if (e.key === 'ArrowRight') { e.preventDefault(); if (!busy) moveTo(clawX + 30) }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play() }
  }

  const refill = () => { setWon([]); setLatest(null); setMsg('idle') }
  const prize = latest == null ? null : capsules[latest]
  const oops = msg === 'miss' || msg === 'slip'

  return (
    <div className="claw">
      <div className="cabinet">
        <div className="marquee">
          <span className="bulbs" aria-hidden="true" />
          <span className="marquee-text">PRIZE <i>✦</i> JOURNEY</span>
        </div>

        <div
          className="claw-glass"
          ref={glass}
          tabIndex={0}
          role="button"
          aria-label="Claw machine. Use left and right arrows to move the claw, Enter to drop it."
          onPointerMove={follow}
          onPointerDown={follow}
          onClick={play}
          onKeyDown={onKey}
        >
          <div className="claw-rail" />
          <div className={`claw-arm ${steering ? 'steer' : ''}`} style={{ transform: `translateX(${clawX}px)` }}>
            <div className="carriage" />
            <div className={`claw-cord ${drop ? 'down' : ''}`} />
            <div className={`claw-head ${closed ? 'closed' : ''}`}>
              <span className="prong p-left" /><span className="prong p-mid" /><span className="prong p-right" />
              {held != null && <Capsule c={capsules[held]} className="in-claw" />}
            </div>
          </div>

          <div className="pile" aria-hidden="true">
            {filler.map((f, k) => (
              <span key={k} className="filler" style={{ left: f.x, bottom: f.b, width: f.size, height: f.size, '--c': f.color, transform: `rotate(${f.tilt}deg)` }} />
            ))}
          </div>
          {capsules.map((c) => (won.includes(c.i) || held === c.i ? null : (
            <Capsule key={c.i} c={c} className={wobble === c.i ? 'wobble' : ''} style={{ left: c.x, bottom: 18 + c.lift, '--tilt': `${c.tilt}deg` }} />
          )))}
          <div className="claw-chute" style={{ left: chuteX }} aria-hidden="true"><span>PRIZES</span></div>
          <div className="glass-shine" aria-hidden="true" />
        </div>

        <div className="panel">
          <div
            className={`joystick ${busy ? 'locked' : ''}`}
            role="slider"
            aria-label="Joystick: drag left or right to move the claw"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((clawX / Math.max(width, 1)) * 100)}
            tabIndex={-1}
            onPointerDown={stickDown}
            onPointerMove={stickMove}
            onPointerUp={stickUp}
            onPointerCancel={stickUp}
          >
            <span className={`stick ${stick.current.held ? 'held' : ''}`} style={{ transform: `rotate(${lean}deg)` }} />
          </div>
          <div className={`screen ${oops ? 'oops' : ''}`} aria-live="polite">{MESSAGES[msg]}</div>
          <button type="button" className="drop-btn" onClick={play} disabled={busy}>DROP</button>
        </div>
        <div className="cabinet-foot">
          <span className="coin" aria-hidden="true">insert curiosity</span>
          {won.length === capsules.length
            ? <button type="button" className="claw-refill" onClick={refill}>refill ↺</button>
            : <span className="prize-door" aria-hidden="true">PUSH</span>}
        </div>
      </div>

      <div className="claw-side">
        <div className={`ticket ${prize ? 'has-prize' : ''}`}>
          <div className="ticket-top">
            <span>{prize ? `PRIZE #${String(prize.num).padStart(2, '0')}` : 'PRIZE TICKET'}</span>
            <span>{won.length}/{capsules.length}</span>
          </div>
          {prize ? (
            <div className="ticket-body" key={prize.i}>
              <span className="when" style={{ background: prize.color, color: INK(prize.color) }}>{prize.when}</span>
              <h3>{prize.title}</h3>
              <p className="where">{prize.where}</p>
              <p className="ticket-text">{prize.text}</p>
            </div>
          ) : (
            <div className="ticket-body">
              <p className="ticket-empty">Win a capsule to print a chapter of my story here.</p>
            </div>
          )}
          <div className="ticket-tear" aria-hidden="true" />
          <div className="ticket-row">
            {capsules.map((c) => (
              <button
                key={c.i}
                type="button"
                className={`claw-chip ${won.includes(c.i) ? 'is-won' : ''} ${latest === c.i ? 'is-open' : ''}`}
                style={{ '--c': c.color }}
                disabled={!won.includes(c.i)}
                onClick={() => setLatest(c.i)}
                aria-label={won.includes(c.i) ? `Show ${c.title}` : 'Not won yet'}
              />
            ))}
          </div>
        </div>
        <button type="button" className="claw-list-toggle" onClick={() => setShowList((v) => !v)} aria-expanded={showList}>
          {showList ? 'hide the list' : 'no time to play? see the whole list →'}
        </button>
        {showList && (
          <ol className="claw-list">
            {capsules.map((c) => (
              <li key={c.i}><span className="claw-list-when">{c.when}</span> <b>{c.title}</b> — {c.where}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

const INK = (c) => (c === '#ffc531' || c === '#a9b6ff' || c === '#ff8a6b' ? '#141312' : '#f2ede4')

function Capsule({ c, className = '', style }) {
  return (
    <span className={`capsule ${className}`} style={{ '--c': c.color, ...style }} aria-hidden="true">
      <span className="capsule-sticker">{c.when.split(' ')[0]}</span>
    </span>
  )
}
