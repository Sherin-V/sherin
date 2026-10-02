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
