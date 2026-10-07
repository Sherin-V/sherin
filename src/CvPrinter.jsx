import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clunk, press, printing } from './toySounds.js'

// The CV as a toy printer: the hero's "CV" button opens it, it prints the CV out of its slot
// (a picture of page one you can scroll), then offers the real PDF to download or open.
const PDF = `${import.meta.env.BASE_URL}assets/SherinV.pdf`
const PREVIEW = `${import.meta.env.BASE_URL}assets/cv-page1.png`
const PRINT_MS = 1450

export default function CvPrinter({ className = '', children }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | printing | printed
  const timer = useRef(0)
  const stopSound = useRef(() => {})
  const closeBtn = useRef(null)
  const opener = useRef(null)

  const print = () => {
    clearTimeout(timer.current)
    clunk()
    setPhase('idle')
    // Next frame, so printing again restarts the paper from inside the printer
    requestAnimationFrame(() => {
      setPhase('printing')
      stopSound.current()
      stopSound.current = printing(PRINT_MS)
      timer.current = setTimeout(() => setPhase('printed'), PRINT_MS)
    })
  }

  const show = (e) => {
    // A plain click opens the printer; ctrl/cmd-click still opens the PDF in a new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    press()
    setPhase('idle')
    setOpen(true)
    timer.current = setTimeout(print, 450)
  }

  const close = () => {
    clearTimeout(timer.current)
    stopSound.current()
    setOpen(false)
    opener.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    closeBtn.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') close() }
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden' // the page behind stays put
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open])

  useEffect(() => () => { clearTimeout(timer.current); stopSound.current() }, [])

  return (
    <>
      <a ref={opener} className={className} href={PDF} target="_blank" rel="noopener" onClick={show}>{children}</a>
      {open && createPortal(
        <div className="cvp-dim" role="dialog" aria-modal="true" aria-label="My CV" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
          <div className={`cvp-box ${phase}`}>
            <button ref={closeBtn} type="button" className="cvp-close" onClick={close} aria-label="Close">✕</button>
            <div className="cvp-printer">
              <span className="cvp-label">CV PRINTER</span>
              <span className="cvp-led" aria-hidden="true" />
              <button type="button" className="cvp-print" onClick={print} disabled={phase === 'printing'}>PRINT</button>
              <span className="cvp-slot" aria-hidden="true" />
            </div>
            <div className="cvp-feed">
              <div className="cvp-paper">
                <span className="cvp-tear" aria-hidden="true" />
                <img src={PREVIEW} alt="Preview of my CV" draggable="false" />
              </div>
            </div>
            <p className="cvp-hint">printing a fresh copy…</p>
            <div className="cvp-actions">
              <a className="btn primary" href={PDF} download="Sherin-Varghese-CV.pdf">⬇ Download PDF</a>
              <a className="btn cvp-open" href={PDF} target="_blank" rel="noopener">Open in new tab ↗</a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
