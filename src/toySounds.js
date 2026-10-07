// Tiny game-console sounds made with the Web Audio API (no audio files).
let ctx = null
const audio = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function blip(freq, start, length, volume = 0.08, type = 'square') {
  const ac = audio()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0008, start + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

// A cartridge clicking into the slot
export function clunk() {
  try {
    const t = audio().currentTime
    blip(140, t, 0.09, 0.18, 'triangle')
    blip(90, t + 0.05, 0.12, 0.14, 'triangle')
  } catch {}
}

// The little start-up chime when the game boots
export function bootChime() {
  try {
    const t = audio().currentTime
    ;[523, 659, 784, 1047].forEach((f, i) => blip(f, t + i * 0.09, 0.16))
  } catch {}
}

// Pressing a button
export function press() {
  try { blip(880, audio().currentTime, 0.05, 0.06) } catch {}
}

// A second of white noise, made once and reused for every printer sound
let noiseBuf = null
const noise = (ac) => {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  return src
}

// A little dot-matrix printer: the head chatters across each line over a whirring motor,
// then the paper zips forward. Lasts `ms`; returns a function that stops it early.
export function printing(ms) {
  const nodes = []
  try {
    const ac = audio()
    const t0 = ac.currentTime + 0.02
    const lines = Math.max(2, Math.round(ms / 240))
    const pass = ms / 1000 / lines

    for (let l = 0; l < lines; l++) {
      const s = t0 + l * pass
      const head = pass * 0.78

      // motor whine, gliding up on one line and down on the next (the head goes back and forth)
      const motor = ac.createOscillator()
      const mf = ac.createBiquadFilter()
      const mg = ac.createGain()
      motor.type = 'sawtooth'
      motor.frequency.setValueAtTime(l % 2 ? 260 : 210, s)
      motor.frequency.linearRampToValueAtTime(l % 2 ? 210 : 260, s + head)
      mf.type = 'lowpass'
      mf.frequency.value = 900
      mg.gain.setValueAtTime(0, s)
      mg.gain.linearRampToValueAtTime(0.025, s + 0.02)
      mg.gain.setValueAtTime(0.025, s + head - 0.03)
      mg.gain.linearRampToValueAtTime(0, s + head)
      motor.connect(mf).connect(mg).connect(ac.destination)
      motor.start(s)
      motor.stop(s + head + 0.02)
      nodes.push(motor)

      // the pins striking the paper: quick bright ticks of noise
      const ticks = Math.round(head / 0.016)
      for (let k = 0; k < ticks; k++) {
        if (Math.random() < 0.18) continue // gaps between words
        const at = s + k * 0.016 + Math.random() * 0.004
        const src = noise(ac)
        const bp = ac.createBiquadFilter()
        const g = ac.createGain()
        bp.type = 'bandpass'
        bp.frequency.value = 2600 + Math.random() * 1400
        bp.Q.value = 1.4
        g.gain.setValueAtTime(0.09 + Math.random() * 0.06, at)
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.007)
        src.connect(bp).connect(g).connect(ac.destination)
        src.start(at, Math.random() * 0.9, 0.01)
        nodes.push(src)
      }

      // the paper feeding forward one line
      const at = s + head
      const feed = noise(ac)
      const ff = ac.createBiquadFilter()
      const fg = ac.createGain()
      ff.type = 'bandpass'
      ff.Q.value = 2
      ff.frequency.setValueAtTime(700, at)
      ff.frequency.exponentialRampToValueAtTime(1900, at + pass - head)
      fg.gain.setValueAtTime(0.06, at)
      fg.gain.exponentialRampToValueAtTime(0.001, at + pass - head)
      feed.connect(ff).connect(fg).connect(ac.destination)
      feed.start(at, Math.random() * 0.5, pass - head + 0.02)
      nodes.push(feed)
    }
  } catch {}
  return () => nodes.forEach((n) => { try { n.stop() } catch {} })
}
