// Little walkie-talkie sounds made with the Web Audio API (no audio files).
// The audio context starts on the first press, since browsers only allow sound after a user gesture.
let ctx = null
let staticNode = null

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noiseBuffer(ac, seconds) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

// Filtered noise that sounds like radio static
function staticSource(ac, seconds, volume) {
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac, seconds)
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 2200
  band.Q.value = 0.8
  const gain = ac.createGain()
  gain.gain.value = volume
  src.connect(band).connect(gain).connect(ac.destination)
  return { src, gain }
}

function tone(ac, freq, start, length, volume = 0.12, type = 'square') {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.setValueAtTime(volume, start + length - 0.02)
  gain.gain.linearRampToValueAtTime(0, start + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

// Pressing the button: a click, a burst of static, then a soft crackle while held
export function keyUp() {
  try {
    const ac = audio()
    const t = ac.currentTime
    tone(ac, 1800, t, 0.03, 0.08)
    const burst = staticSource(ac, 0.25, 0.18)
    burst.gain.gain.setValueAtTime(0.18, t)
    burst.gain.gain.exponentialRampToValueAtTime(0.02, t + 0.25)
    burst.src.start(t)
    stopStatic()
    const hiss = staticSource(ac, 2, 0.025)
    hiss.src.loop = true
    hiss.src.start(t + 0.15)
    staticNode = hiss
  } catch {}
}

export function stopStatic() {
  try { staticNode?.src.stop() } catch {}
  staticNode = null
}

// Let go after a full hold: the two-tone "roger beep" and a static tail
export function roger() {
  try {
    stopStatic()
    const ac = audio()
    const t = ac.currentTime
    tone(ac, 1200, t, 0.09)
    tone(ac, 1600, t + 0.1, 0.12)
    const tail = staticSource(ac, 0.35, 0.12)
    tail.gain.gain.setValueAtTime(0.12, t + 0.24)
    tail.gain.gain.exponentialRampToValueAtTime(0.005, t + 0.55)
    tail.src.start(t + 0.24)
  } catch {}
}

// Let go too early: a low bonk
export function bonk() {
  try {
    stopStatic()
    const ac = audio()
    const t = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, t)
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.18)
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.25)
  } catch {}
}
