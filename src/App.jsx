import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { socials, services } from './data.js'
import { wordAnchorsPx } from './blockLayout.js'
import ClawMachine from './ClawMachine.jsx'
import WalkieContact from './WalkieContact.jsx'
import ProjectConsole from './ProjectConsole.jsx'
import { setTheme, TONES, useTheme } from './theme.js'
import DeskTour from './DeskTour.jsx'

const BlocksScene = lazy(() => import('./BlocksScene.jsx'))

const rise = {
  hidden: { opacity: 0, y: 40 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] } }),
}

function Reveal({ i = 0, className, children, as = 'div' }) {
  const Tag = motion[as]
  return (
    <Tag className={className} variants={rise} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
      {children}
    </Tag>
  )
}

const NAV_LINKS = [['#about', 'About'], ['#projects', 'Projects'], ['#services', 'Services'], ['#journey', 'Journey']]

function Nav() {
  const [open, setOpen] = useState(false) // phone menu
  return (
    <motion.header className="nav" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
      <a className="brand" href="#top" aria-label="sherin.fun, back to top">
        sherin<i className="brand-dot" aria-hidden="true">.</i>
        <span className="brand-blocks" aria-hidden="true">{['f', 'u', 'n'].map((c) => <b key={c}>{c}</b>)}</span>
      </a>
      <nav className="links" aria-label="Main">
        {NAV_LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <ThemeToggle />
      <a className="pill" href="#contact">Let's talk</a>
      <button type="button" className="menu-btn" aria-expanded={open} aria-controls="phone-menu" onClick={() => setOpen((o) => !o)}>
        {open ? 'Close' : 'Menu'}
      </button>
      {open && (
        <nav className="phone-menu" id="phone-menu" aria-label="Sections">
          {[...NAV_LINKS, ['#contact', 'Contact']].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>
      )}
    </motion.header>
  )
}

function BerlinClock() {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 10_000)
    return () => clearInterval(id)
  }, [])
  return <span>Berlin {time}</span>
}

const ease = [0.22, 1, 0.36, 1]
const up = (delay) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.9, ease } })

// Marker notes scribbled around the block name; they find the blocks at any screen size
function HandNotes() {
  const ref = useRef(null)
  const [at, setAt] = useState(null)
  useEffect(() => {
    // Measure the 3D layer itself (it is full-bleed, like this notes layer)
    const stage = ref.current.parentElement.querySelector('.hero-3d')
    const measure = () => setAt({ ...wordAnchorsPx(stage.clientWidth, stage.clientHeight), width: stage.clientWidth })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  // Keep each note inside the screen (phones are narrow)
  const inside = (x, w) => Math.max(10, Math.min(x, (at?.width ?? 9999) - w - 10))
  const draw = (delay) => ({ initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay, duration: 0.5, ease: 'easeOut' } })
  const pop = (delay, rotate) => ({ initial: { opacity: 0, y: 8, rotate }, animate: { opacity: 1, y: 0, rotate }, transition: { delay, duration: 0.45, ease } })

  return (
    <div className="notes" ref={ref} aria-hidden="true">
      {at && (
        <>
          <motion.div className="note note-blue" style={{ left: inside(at.top.right.x + at.blockPx * 0.5, 110), top: at.top.right.y - at.blockPx * 1.55 }} {...pop(2.4, -5)}>
            that's me!
            <svg width="54" height="40" viewBox="0 0 54 40" className="note-arrow" style={{ left: -38, top: 18 }}>
              <motion.path d="M50 4 C32 4 18 14 8 32" {...draw(2.6)} />
              <motion.path d="M8 32 L5 20 M8 32 L19 28" {...draw(3)} />
            </svg>
          </motion.div>

          <motion.div className="note note-red" style={{ left: inside(at.bottom.left.x - at.blockPx * 0.3, 130), top: at.bottom.left.y + at.blockPx * 0.95 }} {...pop(2.8, 3)}>
            made in Berlin
            <svg width="50" height="34" viewBox="0 0 50 34" className="note-arrow" style={{ left: 18, top: -36 }}>
              <motion.path d="M4 30 C10 20 18 12 30 6" {...draw(3)} />
              <motion.path d="M30 6 L19 5 M30 6 L26 16" {...draw(3.35)} />
            </svg>
          </motion.div>

          <motion.div className="note note-ink" style={{ left: at.bottom.right.x + at.blockPx * 0.45, top: at.bottom.right.y - at.blockPx * 0.55 }} {...pop(3.2, 6)}>
            coding<br />since 17
          </motion.div>
        </>
      )}
    </div>
  )
}

// The whole page is one sand tone that deepens as you scroll to the end (light: cream to caramel,
// dark: warm espresso to near-black)
// Both tone layers always exist and CSS shows the one for the current theme, so a theme switch
// repaints in the same instant (the circle spread captures it correctly)
function PageTone() {
  const { scrollYProgress } = useScroll()
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const at = TONES.light.map((_, i) => i / (TONES.light.length - 1))
  const light = useTransform(p, at, TONES.light)
  const dark = useTransform(p, at, TONES.dark)
  return (
    <>
      <motion.div className="page-tone tone-light" style={{ backgroundColor: light }} aria-hidden="true" />
      <motion.div className="page-tone tone-dark" style={{ backgroundColor: dark }} aria-hidden="true" />
    </>
  )
}

// A little toy block that flips between a sun and a moon face
function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const flip = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTheme(next, r.left + r.width / 2, r.top + r.height / 2)
  }
  return (
    <button className={`theme-toggle ${theme}`} type="button" onClick={flip} aria-label={`Switch to ${next} theme`}>
      <span className="cube">
        <span className="face sun">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </span>
        <span className="face moon">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" fill="currentColor" /></svg>
        </span>
      </span>
    </button>
  )
}

// A sun you can pick up and throw. Fling it off the page and night falls (a moon drops in);
// throw the moon away and the day comes back. Slow throws just bounce around the hero.
const BALL = 64
const GRAVITY_PX = 2200 // px/s²
const ESCAPE_SPEED = 900 // px/s needed to fly through the sides

function ThrowableSun() {
  const theme = useTheme()
  const layer = useRef(null)
  const ball = useRef(null)
  const hintRef = useRef(null)
  const state = useRef({ x: 0, y: -BALL * 3, vx: 0, vy: 0, held: false, gone: false, started: false, trail: [] })

  useEffect(() => {
    const s = state.current
    const el = ball.current
    const box = layer.current
    // Floor is the line under the shelves, so the sun rolls along the top of the intro row
    const floorY = () => {
      const foot = box.parentElement.querySelector('.hero-foot')
      return foot.getBoundingClientRect().top - box.getBoundingClientRect().top - BALL
    }
    const hint = hintRef.current
    let raf
    let prev = performance.now()
    const dropAt = prev + 2600

    const tick = (now) => {
      const dt = Math.min((now - prev) / 1000, 1 / 30)
      prev = now
      if (now < dropAt) { raf = requestAnimationFrame(tick); return }
      const W = box.clientWidth
      // Wait until the hero has been laid out (it can briefly measure 0 wide), then drop in on the right
      if (W < 200) { raf = requestAnimationFrame(tick); return }
      if (!s.started) { s.started = true; s.x = W * 0.78 }
      const floor = floorY()
      if (!s.held) {
        s.vy += GRAVITY_PX * dt
        s.vx *= 1 - 0.4 * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        const fast = Math.hypot(s.vx, s.vy) > ESCAPE_SPEED
        if (s.x < -BALL * 1.5 || s.x > W + BALL * 0.5 || s.y < -BALL * 6) {
          // Thrown off the page: switch day and night from where it left, drop the other one in
          if (!s.gone) {
            s.gone = true
            const r = box.getBoundingClientRect()
            const ex = Math.min(Math.max(s.x + BALL / 2 + r.left, 0), innerWidth)
            const ey = Math.min(Math.max(s.y + BALL / 2 + r.top, 0), innerHeight)
            setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', ex, ey)
            Object.assign(s, { x: W * (0.6 + Math.random() * 0.25), y: -BALL * 3, vx: (Math.random() - 0.5) * 200, vy: 0 })
          }
        } else {
          s.gone = false
          if (s.y > floor) {
            s.y = floor
            s.vy = Math.abs(s.vy) > 120 ? -s.vy * 0.5 : 0
            s.vx *= 0.92
          }
          if (!fast) {
            if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx) * 0.6 }
            if (s.x > W - BALL) { s.x = W - BALL; s.vx = -Math.abs(s.vx) * 0.6 }
          }
        }
      }
      el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.x * 0.6}deg)`
      // The note sits on the ground beside the spot where the sun first lands
      const hx = W < 600 ? W * 0.78 - 92 : W * 0.78 + BALL + 10 // left of the sun on phones, right of it on wide screens
      hint.style.transform = `translate(${hx}px, ${floor + BALL - 30}px) rotate(-4deg)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const down = (e) => {
    const s = state.current
    s.held = true
    s.trail = [{ x: e.clientX, y: e.clientY, t: performance.now() }]
    s.grab = { x: e.clientX - s.x, y: e.clientY - s.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e) => {
    const s = state.current
    if (!s.held) return
    s.x = e.clientX - s.grab.x
    s.y = e.clientY - s.grab.y
    s.trail.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    if (s.trail.length > 6) s.trail.shift()
  }
  const up = () => {
    const s = state.current
    if (!s.held) return
    s.held = false
    // Throw speed from the last few pointer moves
    const a = s.trail[0]
    const b = s.trail[s.trail.length - 1]
    const dt = Math.max((b.t - a.t) / 1000, 0.016)
    s.vx = (b.x - a.x) / dt
    s.vy = (b.y - a.y) / dt
  }
  const toss = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    Object.assign(state.current, { vx: 1600, vy: -1300 })
  }

  const sun = theme !== 'dark'
  return (
    <div className="sun-layer" ref={layer}>
      <div
        ref={ball}
        className={`sun-ball ${sun ? 'is-sun' : 'is-moon'}`}
        style={{ transform: `translate(0px, ${-BALL * 3}px)` }}
        role="button"
        tabIndex={0}
        aria-label={sun ? 'Throw the sun away to switch to the dark theme' : 'Throw the moon away to switch to the light theme'}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={toss}
      >
        {sun ? (
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" fill="currentColor" /></svg>
        )}
      </div>
      <span className="throw-hint" ref={hintRef} style={{ transform: `translate(0px, ${-BALL * 4}px)` }}>throw me!</span>
    </div>
  )
}

function Hero() {
  // Until the 3D blocks are ready, show the name as plain type so the hero is never blank
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const on = () => setReady(true)
    window.addEventListener('blocks:ready', on)
    return () => window.removeEventListener('blocks:ready', on)
  }, [])
  return (
    <section className="hero" id="top">
      <div className="hero-3d" aria-hidden="true">
        <Suspense fallback={null}><BlocksScene /></Suspense>
      </div>
      <p className={`hero-fallback ${ready ? 'gone' : ''}`} aria-hidden="true"><span>SHERIN</span><span>VARGHESE</span></p>
      <h1 className="sr-only">Sherin Varghese — software developer in Berlin</h1>
      <motion.div className="hero-top" {...up(0.2)}>
        <span>Software developer</span>
        <BerlinClock />
        <span>Portfolio — 2026</span>
      </motion.div>
      <HandNotes />
      <ThrowableSun />
      <div className="hero-stage" aria-hidden="true" />
      <div className="hero-foot">
        <motion.p className="lede" {...up(1.45)}>
          I build web apps, databases and websites — the useful kind, with a bit of play in them.
        </motion.p>
        <motion.div className="cta" {...up(1.55)}>
          <a className="btn primary" href="#contact">Start a project</a>
          <a className="btn line-btn" href={`${import.meta.env.BASE_URL}assets/SherinV.pdf`} target="_blank" rel="noopener">CV ↓</a>
        </motion.div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="section about-section" id="about">
      <Reveal className="kicker">01 — About</Reveal>
      <Reveal i={1}>
        <DeskTour>
          <h2 className="title">Coding since 17.<br /><span className="grad">Still having fun.</span></h2>
          <p className="body">I've finished my master's in computer science and now build software at Macrix — and I care as much about how a product feels as how it works.</p>
          <p className="body">Away from the keyboard you'll find me exploring new places, trying new recipes or deep in a good book.</p>
          <div className="links-row">
            {socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noopener">{s.label} ↗</a>)}
          </div>
        </DeskTour>
      </Reveal>
    </section>
  )
}

// Services as sticky notes taped to the wall, each at its own slight angle
const NOTE_TILT = [-2, 1.5, -1, 2, -1.5, 1]
const TAPE = ['rgb(242 237 228 / .75)', 'rgb(255 197 49 / .8)', 'rgb(169 182 255 / .75)']
const TAG_INK = ['#e2401c', '#3d5afe', '#141312']

function Projects() {
  return (
    <section className="section" id="projects">
      <Reveal className="kicker">02 — Projects</Reveal>
      <Reveal as="h2" className="title">Things I've <span className="grad">built</span></Reveal>
      <Reveal i={1}><ProjectConsole /></Reveal>
    </section>
  )
}

function Services() {
  return (
    <section className="section" id="services">
      <Reveal className="kicker">03 — Services</Reveal>
      <Reveal as="h2" className="title">What I can build <span className="grad">for you</span></Reveal>
      <ul className="notes-wall">
        {services.map((s, i) => (
          <Reveal as="li" key={s.title} i={i} className="sticky">
            <div className="sticky-paper" style={{ '--note': s.note, '--r': `${NOTE_TILT[i % NOTE_TILT.length]}deg`, '--tape': TAPE[i % TAPE.length] }}>
              <h3 className="sticky-title">{s.title}</h3>
              <p className="sticky-text">{s.text}</p>
              <p className="sticky-tags" style={{ color: TAG_INK[i % TAG_INK.length] }}>→ {s.tags}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

function Journey() {
  return (
    <section className="section" id="journey">
      <Reveal className="kicker">04 — Journey</Reveal>
      <Reveal as="h2" className="title">The road <span className="grad">so far</span></Reveal>
      <Reveal i={1}><ClawMachine /></Reveal>
    </section>
  )
}

function Contact() {
  return (
    <section className="section contact" id="contact">
      <Reveal className="kicker">05 — Contact</Reveal>
      <Reveal i={1}>
        <WalkieContact>
          <h2 className="huge">Got an idea?<br /><span className="grad">Let's make it fun.</span></h2>
          {/* Other ways to reach me, styled as radio channels beside the walkie-talkie */}
          <div className="channels">
            <p className="channels-title">OTHER CHANNELS</p>
            {[
              { ch: '01', label: 'EMAIL', value: 'sherinv.de@gmail.com', href: 'mailto:sherinv.de@gmail.com' },
              { ch: '02', label: 'PHONE', value: '+49 151 2335 5664', href: 'tel:+4915123355664' },
              { ch: '03', label: 'HOME BASE', value: 'Berlin, Germany' },
            ].map((c) => {
              const Tag = c.href ? 'a' : 'div'
              return (
                <Tag key={c.ch} className="channel" {...(c.href ? { href: c.href } : {})}>
                  <span className="channel-badge">CH {c.ch}</span>
                  <span className="channel-lcd">
                    <small>{c.label}</small>
                    <span>{c.value}</span>
                  </span>
                  <span className="channel-bars" aria-hidden="true"><i /><i /><i /><i /></span>
                </Tag>
              )
            })}
          </div>
        </WalkieContact>
      </Reveal>
    </section>
  )
}

export default function App() {
  return (
    <>
      <PageTone />
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects />
        <Services />
        <Journey />
        <Contact />
      </main>
      <footer className="footer">
        <span>© {new Date().getFullYear()} Sherin Varghese</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </>
  )
}
