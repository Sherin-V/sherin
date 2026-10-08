import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { skills } from './data.js'
import { useTheme } from './theme.js'

// About: the desk photo with soft glowing spots on the things on the desk.
// Tapping one writes a sticky note and draws a hand-drawn arrow from it to that spot.
// x/y are percentages of the photo.
const SPOTS = [
  { x: 57, y: 52, title: 'the human', text: 'Sherin, developer in Berlin. Coding since 17 and still smiling about it.' },
  { x: 78, y: 68, title: 'the laptop', text: 'Where ideas turn into real web apps. My toolbox:', skills: true },
  { x: 12, y: 86, title: 'the books', text: "Master's in computer science at IU: done! Now building software at Macrix." },
  { x: 10, y: 24, title: 'the notes', text: 'Ideas waiting to be built. Got one? Channel 05 is open.' },
  { x: 90, y: 15, title: 'the teddy', text: 'Chief debugging officer. Listens to every bug without judging.' },
  { x: 92, y: 90, title: 'the mug', text: 'Fuel. Off-screen it is travel, new recipes and a good book.' },
]
const CHIP = ['#3d5afe', '#141312', '#ff5a36']

export default function DeskTour({ children }) {
  const [active, setActive] = useState(null)
  const wrap = useRef(null)
  const note = useRef(null)
  const dots = useRef([])
  const [arrow, setArrow] = useState(null)
  const dark = useTheme() === 'dark'
  const [hasNight, setHasNight] = useState(true) // false if the night photo isn't there yet

  // Curve from the note's edge that faces the spot, ending in an arrowhead just short of it
  const draw = useCallback(() => {
    const dot = dots.current[active]
    if (active == null || !dot || !wrap.current || !note.current) { setArrow(null); return }
    const W = wrap.current.getBoundingClientRect()
    const N = note.current.getBoundingClientRect()
    const D = dot.getBoundingClientRect()
    const ex = D.left + D.width / 2 - W.left
    const ey = D.top + D.height / 2 - W.top
    let sx, sy
    if (ex > N.right - W.left) { sx = N.right - W.left + 6; sy = N.top - W.top + 26 } // spot is to the right
    else if (ey < N.top - W.top) { sx = N.left + N.width / 2 - W.left; sy = N.top - W.top - 6 } // spot is above
    else { sx = N.left + N.width / 2 - W.left; sy = N.bottom - W.top + 6 }
    const len = Math.hypot(ex - sx, ey - sy) || 1
    const ux = (ex - sx) / len
    const uy = (ey - sy) / len
    const tx = ex - ux * 18 // stop before the spot
    const ty = ey - uy * 18
    // Bow the curve sideways a little, like a quick pen stroke
    const cx = (sx + tx) / 2 - uy * len * 0.18
    const cy = (sy + ty) / 2 + ux * len * 0.18
    // Arrowhead follows the curve's final direction
    const ax = tx - cx
    const ay = ty - cy
    const al = Math.hypot(ax, ay) || 1
    const hx = ax / al
    const hy = ay / al
    const head = `M${tx - hx * 12 - hy * 7} ${ty - hy * 12 + hx * 7} L${tx} ${ty} L${tx - hx * 12 + hy * 7} ${ty - hy * 12 - hx * 7}`
    setArrow({ line: `M${sx} ${sy} Q${cx} ${cy} ${tx} ${ty}`, head })
  }, [active])

  useLayoutEffect(() => {
    draw()
    const ro = new ResizeObserver(draw)
    if (wrap.current) ro.observe(wrap.current)
    if (note.current) ro.observe(note.current)
    return () => ro.disconnect()
  }, [draw])

  const spot = active == null ? null : SPOTS[active]
  return (
    <div className="desk-tour" ref={wrap}>
      <div className="desk-text">{children}</div>

      <div className="desk-note" ref={note} style={{ '--r': `${active == null ? -2 : active % 2 ? 1.5 : -2}deg` }} aria-live="polite">
        {spot ? (
          <>
            <b>{spot.title}</b>
            <span>{spot.text}</span>
            {spot.skills && (
              <span className="desk-chips">
                {skills.map((s, i) => <i key={s} style={{ background: CHIP[i % CHIP.length] }}>{s}</i>)}
              </span>
            )}
          </>
        ) : (
          <span>psst, tap the glowing spots on my desk <em className="desk-dir" /></span>
        )}
      </div>

      <figure className="desk-photo">
        <img src={`${import.meta.env.BASE_URL}assets/sherin-varghese-software-engineer-berlin.jpg`} alt="Sherin Varghese, software engineer in Berlin, smiling at a desk with a laptop and colourful toy props" draggable="false" />
        {/* Same desk at night, faded in over the day photo in the dark theme */}
        {hasNight && (
          <img className={`desk-night${dark ? ' on' : ''}`} src={`${import.meta.env.BASE_URL}assets/sherin-varghese-software-engineer-berlin-night.jpg`} alt="" aria-hidden="true" draggable="false" onError={() => setHasNight(false)} />
        )}
        {SPOTS.map((s, i) => (
          <button
            key={s.title}
            ref={(el) => { dots.current[i] = el }}
            className={`desk-spot${active === i ? ' on' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${i * 0.35}s` }}
            onClick={() => setActive(i)}
            aria-label={s.title}
            aria-pressed={active === i}
          />
        ))}
      </figure>

      {arrow && (
        <svg className="desk-arrow" aria-hidden="true">
          <path key={arrow.line} className="desk-line" d={arrow.line} />
          <path d={arrow.head} />
        </svg>
      )}
    </div>
  )
}
