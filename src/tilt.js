import { useEffect, useState } from 'react'

// Left/right tilt of the phone from its motion sensor, as -1 (left) … 1 (right).
// The hero shelves and the claw machine read it on every frame. iPhones only share motion after
// a tap and a permission prompt, so the first tap on the page asks; Android shares it right away.
const DEADZONE = 3 // degrees of tilt that count as "held flat"
const FULL = 25 // degrees of tilt that count as all the way

let value = 0
let active = false
let started = false
const listeners = new Set()

function onOrient(e) {
  // gamma is left/right in portrait; in landscape the phone's other axis is the sideways one
  const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0
  let deg = e.gamma
  if (angle === 90) deg = -e.beta
  if (angle === -90 || angle === 270) deg = e.beta
  if (deg == null) return
  const past = Math.max(0, Math.abs(deg) - DEADZONE)
  value = Math.sign(deg) * Math.min(1, past / (FULL - DEADZONE))
  if (!active) {
    active = true
    listeners.forEach((fn) => fn(true))
  }
}

function listen() {
  window.addEventListener('deviceorientation', onOrient)
}

export function startTilt() {
  if (started || typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return
  // Only on touch screens: laptops can report orientation too, and there the mouse already steers
  if (!window.matchMedia('(pointer: coarse)').matches) return
  started = true
  // Android sends readings straight away; iPhones send nothing until permission is granted
  listen()
  const ask = DeviceOrientationEvent.requestPermission
  if (typeof ask !== 'function') return
  // So if nothing has arrived by the first tap, ask then (it has to come from inside a tap)
  const onTap = () => {
    window.removeEventListener('click', onTap, true)
    if (!active) ask.call(DeviceOrientationEvent).catch(() => {})
  }
  window.addEventListener('click', onTap, true)
}

export const tilt = {
  get x() { return value },
  get active() { return active },
}

// True once the phone has reported a tilt (so the page can show the tilt controls)
export function useTiltActive() {
  const [on, setOn] = useState(active)
  useEffect(() => {
    startTilt()
    if (active) setOn(true)
    listeners.add(setOn)
    return () => listeners.delete(setOn)
  }, [])
  return on
}
