import { lazy, Suspense, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { socials, services, journey, FORM_URL } from './data.js'

const BlocksScene = lazy(() => import('./BlocksScene.jsx'))
const SkillsScene = lazy(() => import('./SkillsScene.jsx'))

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

// Card that tilts in 3D toward the pointer
function Tilt({ className, style, children }) {
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const rx = useSpring(useTransform(y, [0, 1], [10, -10]), { stiffness: 200, damping: 18 })
  const ry = useSpring(useTransform(x, [0, 1], [-12, 12]), { stiffness: 200, damping: 18 })
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width)
    y.set((e.clientY - r.top) / r.height)
    e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  const onLeave = () => { x.set(0.5); y.set(0.5) }
  return (
    <motion.div className={`tilt ${className ?? ''}`} style={{ ...style, rotateX: rx, rotateY: ry, transformPerspective: 900 }} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </motion.div>
  )
}

function Nav() {
  return (
    <motion.header className="nav" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
      <a className="brand" href="#top">sherin<span>.fun</span></a>
      <nav className="links" aria-label="Main">
        <a href="#about">About</a>
        <a href="#services">Services</a>
        <a href="#journey">Journey</a>
      </nav>
      <a className="pill" href="#contact">Let's talk</a>
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

function Badge() {
  return (
    <svg className="badge" viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id="ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
      <circle cx="60" cy="60" r="58" />
      <text><textPath href="#ring">AVAILABLE FOR FREELANCE ✦ AVAILABLE FOR FREELANCE ✦ </textPath></text>
      <path className="star" d="M60 44 L64 56 L76 60 L64 64 L60 76 L56 64 L44 60 L56 56 Z" />
    </svg>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-3d" aria-hidden="true">
        <Suspense fallback={null}><BlocksScene /></Suspense>
      </div>
      <h1 className="sr-only">Sherin Varghese — software developer in Berlin</h1>
      <motion.div className="hero-top" {...up(0.2)}>
        <span>Software developer</span>
        <BerlinClock />
        <span>Portfolio — 2026</span>
      </motion.div>
      <motion.div className="badge-wrap" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 1.6, type: 'spring', stiffness: 160, damping: 12 }}>
        <Badge />
      </motion.div>
      <div className="hero-stage" aria-hidden="true" />
      <div className="hero-foot">
        <motion.p className="lede" {...up(1.45)}>
          I build web apps, databases and websites — the useful kind, with a bit of play in them.
        </motion.p>
        <motion.div className="cta" {...up(1.55)}>
          <a className="btn primary" href="#contact">Start a project</a>
          <a className="btn line-btn" href="/assets/SherinV.pdf" target="_blank" rel="noopener">CV ↓</a>
        </motion.div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="section about-section" id="about">
      <div className="about-3d" aria-hidden="true">
        <Suspense fallback={null}><SkillsScene /></Suspense>
      </div>
      <Reveal className="kicker">01 — About</Reveal>
      <div className="about">
        <Tilt className="photo">
          <img src="/assets/sv.jpeg" alt="Sherin Varghese sitting on a stone bench in a Berlin park in autumn" />
          <span className="sticker">hi! 👋</span>
        </Tilt>
        <div>
          <Reveal as="h2" className="title">Coding since 17.<br /><span className="grad">Still having fun.</span></Reveal>
          <Reveal i={1} as="p" className="body">I'm studying for a master's in computer science while building web applications — and I care as much about how a product feels as how it works.</Reveal>
          <Reveal i={2} as="p" className="body">Away from the keyboard you'll find me exploring new places, trying new recipes or deep in a good book.</Reveal>
          <Reveal i={3} className="links-row">
            {socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noopener">{s.label} ↗</a>)}
          </Reveal>
        </div>
        <p className="skills-hint">My toolbox → push it around, click to scatter</p>
      </div>
    </section>
  )
}

function Services() {
  return (
    <section className="section" id="services">
      <Reveal className="kicker">02 — Services</Reveal>
      <Reveal as="h2" className="title">What I can build <span className="grad">for you</span></Reveal>
      <div className="bento">
        {services.map((s, i) => (
          <Reveal key={s.title} i={i} className={`cell c${i}`}>
            <Tilt className="card" style={{ '--c': s.color }}>
              <span className="icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Journey() {
  return (
    <section className="section" id="journey">
      <Reveal className="kicker">03 — Journey</Reveal>
      <Reveal as="h2" className="title">The road <span className="grad">so far</span></Reveal>
      <ol className="road">
        {journey.map((j, i) => (
          <Reveal as="li" key={j.title} i={i}>
            <span className="when">{j.when}</span>
            <h3>{j.title}</h3>
            <p className="where">{j.where}</p>
            <p>{j.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

function ContactForm() {
  const [status, setStatus] = useState({ kind: '', text: '' })
  const [sending, setSending] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      setStatus({ kind: 'err', text: 'Please fill in every field with a valid email.' })
      return
    }
    setSending(true)
    setStatus({ kind: '', text: 'Sending…' })
    try {
      await fetch(FORM_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(form)) })
      form.reset()
      setStatus({ kind: 'ok', text: 'Thanks! Your message is on its way.' })
    } catch {
      setStatus({ kind: 'err', text: 'Something went wrong. Please email me directly.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="form" noValidate onSubmit={onSubmit}>
      <div className="row">
        <label>Name<input name="names" autoComplete="name" required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <label>Subject<input name="subject" required /></label>
      <label>Message<textarea name="message" rows="4" required /></label>
      <button className="btn primary" type="submit" disabled={sending}>Send message →</button>
      <p className={`status ${status.kind}`} role="status" aria-live="polite">{status.text}</p>
    </form>
  )
}

function Contact() {
  return (
    <section className="section contact" id="contact">
      <Reveal className="kicker">04 — Contact</Reveal>
      <Reveal as="h2" className="huge">Got an idea?<br /><span className="grad">Let's make it fun.</span></Reveal>
      <div className="contact-grid">
        <Reveal i={1} className="details">
          <a href="mailto:sherinv.de@gmail.com"><small>Email</small>sherinv.de@gmail.com</a>
          <a href="tel:+4915123355664"><small>Phone</small>+49 151 2335 5664</a>
          <div><small>City</small>Berlin, Germany</div>
        </Reveal>
        <Reveal i={2}><ContactForm /></Reveal>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
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
