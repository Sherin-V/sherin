import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, Text } from '@react-three/drei'
import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { livePointer } from './livePointer.js'
import drops from './assets/block-drops.json'
import { blockLayout, CAMERA_Z, FOV, SHELF_BACK, SHELF_RISE } from './blockLayout.js'
import { useTheme } from './theme.js'
import { isPhone } from './usePhone.js'
import { startTilt, tilt } from './tilt.js'

// Each word falls onto its own toy shelf. The fall is real rigid-body physics
// (gravity, bounces, friction, no steering), simulated ahead of time; from many random
// throws only the ones that happened to land readable were kept, and one is picked per visit.
// Once it has landed, live physics takes over: the shelves tilt toward the mouse (or with the
// phone, when it is tilted), blocks slide, and any that slide off the end fall away for good.
const COLORS = ['#ff5a36', '#3d5afe', '#ffc531', '#141312']
const FONT = `${import.meta.env.BASE_URL}fonts/bricolage-800.woff`
const SHELF_DEPTH = 2.3
const MAX_TILT = 0.34 // radians, about 20 degrees
const GRAVITY = 24
const STEP = 1 / 60

// The six faces as [rotation, offset] in block space (same order the simulation used)
const FACES = [
  [[0, 0, 0], [0, 0, 0.51]],
  [[0, Math.PI, 0], [0, 0, -0.51]],
  [[0, Math.PI / 2, 0], [0.51, 0, 0]],
  [[0, -Math.PI / 2, 0], [-0.51, 0, 0]],
  [[-Math.PI / 2, 0, 0], [0, 0.51, 0]],
  [[Math.PI / 2, 0, 0], [0, -0.51, 0]],
]

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shelfLength = (word) => word.length * drops.gap + 0.5
const physicsReady = RAPIER.init()

function useLayout() {
  const { viewport } = useThree()
  return blockLayout(viewport.width, viewport.height)
}

function Block({ id, letter, color, index, run, offset, sim }) {
  const ref = useRef()
  const ink = color === '#ffc531' ? '#141312' : '#f2ede4'
  const [frontFace, turns] = run.faces[index]
  const qa = useMemo(() => new THREE.Quaternion(), [])
  const qb = useMemo(() => new THREE.Quaternion(), [])

  useFrame(({ clock }) => {
    const g = ref.current
    const live = sim.current.world
    if (live) {
      // Live physics: copy the body back into this shelf's space
      const body = sim.current.bodies[id]
      if (!body) { g.visible = false; return }
      const p = body.translation()
      const r = body.rotation()
      g.position.set(p.x - offset[0], p.y - offset[1], p.z - offset[2])
      g.quaternion.set(r.x, r.y, r.z, r.w)
      return
    }
    // Recorded fall, smoothly between recorded frames
    sim.current.start ??= clock.elapsedTime
    const f = (clock.elapsedTime - sim.current.start) * drops.fps
    const last = run.frames.length - 1
    const i = Math.min(Math.floor(f), last)
    const j = Math.min(i + 1, last)
    const a = run.frames[i]
    const b = run.frames[j]
    const t = i === last ? 0 : f - i
    const o = index * 7
    g.position.set(
      THREE.MathUtils.lerp(a[o], b[o], t),
      THREE.MathUtils.lerp(a[o + 1], b[o + 1], t),
      THREE.MathUtils.lerp(a[o + 2], b[o + 2], t),
    )
    qa.set(a[o + 3], a[o + 4], a[o + 5], a[o + 6])
    qb.set(b[o + 3], b[o + 4], b[o + 5], b[o + 6])
    g.quaternion.slerpQuaternions(qa, qb, t)
  })

  const first = run.frames[0]
  return (
    <group ref={ref} position={[first[index * 7], first[index * 7 + 1], first[index * 7 + 2]]}>
      <RoundedBox args={[1, 1, 1]} radius={0.13} smoothness={5} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.38} />
      </RoundedBox>
      {/* One letter, printed on the side that ends up facing you, turned upright */}
      <group position={FACES[frontFace][1]} rotation={FACES[frontFace][0]}>
        <Text font={FONT} fontSize={0.72} rotation={[0, 0, (turns * Math.PI) / 2]} color={ink} anchorX="center" anchorY="middle">
          {letter}
        </Text>
      </group>
    </group>
  )
}

function Shelf({ name, word, colorOffset, run, offset, sim }) {
  // Black plank on light sand, cream plank on dark sand
  const plank = useTheme() === 'dark' ? '#e9dcc6' : '#141312'
  return (
    <group position={offset}>
      {/* The plank tilts around its centre */}
      <group ref={(g) => { sim.current.planks[name] = g }}>
        <mesh position={[0, -0.06, 0]} receiveShadow castShadow>
          <boxGeometry args={[shelfLength(word), 0.12, SHELF_DEPTH]} />
          <meshStandardMaterial color={plank} roughness={0.6} />
        </mesh>
      </group>
      {word.split('').map((letter, i) => (
        <Block key={i} id={`${name}-${i}`} index={i} letter={letter} color={COLORS[(i + colorOffset) % COLORS.length]} run={run} offset={offset} sim={sim} />
      ))}
    </group>
  )
}

// Build a live physics world from where every block landed
function startLivePhysics(shelves) {
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 })
  world.timestep = STEP
  const bodies = {}
  const planks = {}
  for (const { name, word, run, offset } of shelves) {
    const plank = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...offset))
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(shelfLength(word) / 2, 0.06, SHELF_DEPTH / 2).setTranslation(0, -0.06, 0).setFriction(0.28),
      plank,
    )
    planks[name] = plank
    const rest = run.frames[run.frames.length - 1]
    word.split('').forEach((_, i) => {
      const o = i * 7
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(rest[o] + offset[0], rest[o + 1] + offset[1], rest[o + 2] + offset[2])
          .setRotation({ x: rest[o + 3], y: rest[o + 4], z: rest[o + 5], w: rest[o + 6] })
          .setCanSleep(false)
          .setCcdEnabled(true),
      )
      world.createCollider(RAPIER.ColliderDesc.roundCuboid(0.37, 0.37, 0.37, 0.13).setFriction(0.28).setRestitution(0.2), body)
      bodies[`${name}-${i}`] = body
    })
  }
  return { world, bodies, planksBody: planks }
}

function Toybox() {
  const { size, base } = useLayout()
  const [top, bottom] = drops.words
  // A different real fall on every visit
  const runs = useMemo(() => ({ top: pick(drops.runs[top]), bottom: pick(drops.runs[bottom]) }), [top, bottom])
  const shelves = useMemo(() => [
    { name: 'top', word: top, run: runs.top, offset: [0, SHELF_RISE, -SHELF_BACK], colorOffset: 0 },
    { name: 'bottom', word: bottom, run: runs.bottom, offset: [0, 0, 0], colorOffset: 2 },
  ], [top, bottom, runs])
  const sim = useRef({ start: null, world: null, bodies: {}, planks: {}, planksBody: {}, tilt: 0, carry: 0 })
  const ready = useRef(false)
  const landedAt = useMemo(() => Math.max(runs.top.frames.length, runs.bottom.frames.length) / drops.fps + 0.2, [runs])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const z = useMemo(() => new THREE.Vector3(0, 0, 1), [])

  useEffect(() => {
    // The blocks are on screen: the page can drop its plain-text name
    window.dispatchEvent(new Event('blocks:ready'))
    startTilt()
    physicsReady.then(() => { ready.current = true })
    // Switching theme bumps the shelves: every block gives a small hop
    const hop = () => {
      for (const body of Object.values(sim.current.bodies)) {
        const m = body.mass()
        body.applyImpulse({ x: 0, y: (3.5 + Math.random() * 1.5) * m, z: 0 }, true)
        body.applyTorqueImpulse({ x: 0, y: 0, z: (Math.random() - 0.5) * 0.25 * m }, true)
      }
    }
    window.addEventListener('themechange', hop)
    return () => {
      window.removeEventListener('themechange', hop)
      sim.current.world?.free()
    }
  }, [])

  useFrame(({ clock, pointer }, delta) => {
    const s = sim.current
    if (!s.world) {
      if (!ready.current || s.start == null || clock.elapsedTime - s.start < landedAt) return
      Object.assign(s, startLivePhysics(shelves))
    }

    // Lean the shelves toward the mouse while it is over the hero; level out otherwise.
    // On a phone with a motion sensor the shelves follow the phone's own tilt instead.
    const over = Math.abs(pointer.x) <= 1 && Math.abs(pointer.y) <= 1
    const target = tilt.active ? -tilt.x * MAX_TILT : over ? -pointer.x * MAX_TILT : 0
    s.tilt = THREE.MathUtils.damp(s.tilt, target, 4, delta)
    q.setFromAxisAngle(z, s.tilt)
    for (const { name } of shelves) {
      s.planksBody[name].setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      s.planks[name]?.quaternion.copy(q)
    }

    s.carry = Math.min(s.carry + delta, STEP * 4)
    while (s.carry >= STEP) {
      s.world.step()
      s.carry -= STEP
    }

    // Blocks that slid off the end are gone for good
    for (const [id, body] of Object.entries(s.bodies)) {
      if (body.translation().y < -14) {
        s.world.removeRigidBody(body)
        delete s.bodies[id]
      }
    }
  })

  return (
    <group scale={size} position={[0, base, 0]}>
      {shelves.map((shelf) => <Shelf key={shelf.name} {...shelf} sim={sim} />)}
    </group>
  )
}

// Only draw while the hero is on screen and the tab is visible: scrolled past or in a
// background tab, the scene stops (no rendering, no physics) and picks up where it left off.
function useOnScreen() {
  const [box, setBox] = useState(null)
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    if (!box) return
    let inView = true
    const update = () => setOnScreen(inView && document.visibilityState === 'visible')
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; update() })
    io.observe(box)
    document.addEventListener('visibilitychange', update)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [box])
  return [setBox, onScreen]
}

export default function BlocksScene() {
  const [boxRef, onScreen] = useOnScreen()
  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%' }}>
    <Canvas
      frameloop={onScreen ? 'always' : 'never'}
      shadows={!isPhone()} // real-time shadows are costly on phones
      dpr={isPhone() ? [1, 1.5] : [1, 1.75]}
      camera={{ position: [0, 0, CAMERA_Z], fov: FOV }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
      onCreated={livePointer}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 9, 7]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
      <Suspense fallback={null}>
        <Toybox />
      </Suspense>
      <Environment resolution={256}>
        <color attach="background" args={['#d9d2c4']} />
        <Lightformer form="rect" intensity={2.5} position={[0, 5, -6]} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={2} position={[-6, 1, 2]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={2} position={[6, -1, 2]} scale={[2, 8, 1]} />
      </Environment>
    </Canvas>
    </div>
  )
}
