import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, RoundedBox, Text } from '@react-three/drei'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { livePointer } from './livePointer.js'
import { skills } from './data.js'
import { useTheme } from './theme.js'

// A wobbly tower of skill bricks on a little base, standing on the ground (real physics).
// Bricks can be picked up, pulled out and thrown; knock it over and stack it back up by hand.
const COLORS = ['#141312', '#ff5a36', '#3d5afe', '#ffc531', '#f2ede4', '#ff5a36', '#3d5afe']
const FONT = `${import.meta.env.BASE_URL}fonts/bricolage-800.woff`
const DROP_EVERY = 0.38 // seconds between bricks while building
const rand = THREE.MathUtils.randFloatSpread

// Widest brick at the bottom
const ORDER = [...skills].sort((a, b) => b.length - a.length)

function useTower() {
  const { viewport } = useThree()
  const wide = viewport.aspect > 1
  const h = Math.min(viewport.height * 0.055, viewport.width * (wide ? 0.042 : 0.075))
  return {
    h,
    towerX: wide ? viewport.width * 0.24 : 0,
    // The base sits on the ground line near the bottom of the section
    base: -viewport.height * (wide ? 0.4 : 0.42),
    view: viewport,
  }
}

const LABEL_FACES = (w, h, d) => [
  [[0, 0, d / 2 + 0.005], [0, 0, 0]],
  [[0, 0, -d / 2 - 0.005], [0, Math.PI, 0]],
  [[0, h / 2 + 0.005, 0], [-Math.PI / 2, 0, 0]],
  [[0, -h / 2 - 0.005, 0], [Math.PI / 2, 0, 0]],
]

function Brick({ label, color, size, position, rotation, register, onGrab }) {
  const ink = color === '#ffc531' || color === '#f2ede4' ? '#141312' : '#f2ede4'
  const [w, h, d] = size
  return (
    <RigidBody ref={register} position={position} rotation={rotation} colliders="cuboid" ccd restitution={0.05} friction={0.95} linearDamping={0.05} angularDamping={0.2}>
      <group
        onPointerDown={onGrab}
        onPointerOver={() => (document.body.style.cursor = 'grab')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
      <RoundedBox args={size} radius={h * 0.12} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.4} />
      </RoundedBox>
      {LABEL_FACES(w, h, d).map(([pos, rot], i) => (
        <Text key={i} font={FONT} fontSize={h * 0.46} position={pos} rotation={rot} color={ink} anchorX="center" anchorY="middle" maxWidth={w * 0.92}>
          {label}
        </Text>
      ))}
      </group>
    </RigidBody>
  )
}

function Tower({ onState }) {
  const { h, towerX, base, view } = useTower()
  const wood = useTheme() === 'dark' ? '#e9dcc6' : '#141312'
  const plank = useRef()
  const bodies = useRef([])
  const [count, setCount] = useState(0) // bricks dropped so far
  const clockStart = useRef(null)
  const baseX = useRef(towerX) // the base stays put; only hands knock the tower over
  const lastDrop = useRef(-1)
  const builtAt = useRef(null)
  const fell = useRef(false)
  const held = useRef(null) // { i, offset, trail }
  // Start pose is fixed the moment a brick appears, so later re-renders never teleport it
  const spawn = useRef([])
  const spin = useRef([])
  const { camera, raycaster } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const level = useMemo(() => new THREE.Quaternion(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])

  // Pick a brick up: it follows the mouse in hand, levelled out so it is easy to stack
  const grab = (i) => (e) => {
    e.stopPropagation()
    const b = bodies.current[i]
    if (!b || held.current) return
    const p = b.translation()
    held.current = { i, offset: { x: p.x - e.point.x, y: p.y - e.point.y }, trail: [] }
    b.setBodyType(2, true) // kinematic while held
    document.body.style.cursor = 'grabbing'
  }

  // Let go: back to real physics, keeping the speed of the throw
  useEffect(() => {
    const drop = () => {
      const h0 = held.current
      if (!h0) return
      held.current = null
      document.body.style.cursor = ''
      const b = bodies.current[h0.i]
      if (!b) return
      b.setBodyType(0, true)
      const tr = h0.trail
      if (tr.length > 1) {
        const a = tr[0]
        const z = tr[tr.length - 1]
        const dt = Math.max(z.t - a.t, 1 / 60)
        const vx = THREE.MathUtils.clamp((z.x - a.x) / dt, -14, 14)
        const vy = THREE.MathUtils.clamp((z.y - a.y) / dt, -14, 14)
        b.setLinvel({ x: vx, y: vy, z: 0 }, true)
      }
    }
    window.addEventListener('pointerup', drop)
    window.addEventListener('pointercancel', drop)
    return () => {
      window.removeEventListener('pointerup', drop)
      window.removeEventListener('pointercancel', drop)
    }
  }, [])
  const plankW = h * (1.2 + ORDER[0].length * 0.34) + h * 0.8

  // Each brick drops onto the top of the stack, a little off-centre and twisted
  const bricks = useMemo(() => {
    return ORDER.map((label, i) => {
      const w = h * (1.2 + label.length * 0.34)
      return { label, color: COLORS[i % COLORS.length], size: [w, h, h * 1.15], dx: rand(h * 0.22), yaw: rand(0.28) }
    })
  }, [h])

  useFrame(({ clock, pointer }, delta) => {
    clockStart.current ??= clock.elapsedTime
    const t = clock.elapsedTime - clockStart.current
    // Drop the next brick only once the last one has settled, from just above the top of the stack
    const placed = bodies.current.slice(0, count).filter(Boolean)
    const lastBody = placed[placed.length - 1]
    const settled = !lastBody || Math.hypot(...Object.values(lastBody.linvel())) < 0.15
    if (count < ORDER.length && placed.length === count && settled && t - lastDrop.current > DROP_EVERY) {
      const top = placed.reduce((y, b) => Math.max(y, b.translation().y), base)
      spawn.current[count] = [baseX.current + bricks[count].dx, top + h * 1.7, 0]
      lastDrop.current = t
      setCount(count + 1)
    }
    if (count === ORDER.length && builtAt.current == null && settled) builtAt.current = t

    // Carry the held brick with the mouse, never below the base
    if (held.current) {
      const b = bodies.current[held.current.i]
      raycaster.setFromCamera(pointer, camera)
      if (b && raycaster.ray.intersectPlane(plane, hit)) {
        const x = THREE.MathUtils.clamp(hit.x + held.current.offset.x, -view.width / 2 + h, view.width / 2 - h)
        const y = Math.max(hit.y + held.current.offset.y, base + h * 0.7)
        b.setNextKinematicTranslation({ x, y, z: 0 })
        const r = b.rotation()
        q.set(r.x, r.y, r.z, r.w).slerp(level, Math.min(1, delta * 10))
        b.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        const tr = held.current.trail
        tr.push({ x, y, t: clock.elapsedTime })
        if (tr.length > 6) tr.shift()
      }
    }

    // Safety net: a brick shoved through the floor or out of view drops back in just above the ground
    bodies.current.forEach((b, i) => {
      if (!b || held.current?.i === i) return
      const p = b.translation()
      const lost = p.y < base - h * 0.6 || Math.abs(p.x) > view.width / 2 + h * 0.5 || Math.abs(p.z) > 1.4
      if (!lost) return
      const edge = view.width / 2 - h * 3
      b.setTranslation({ x: THREE.MathUtils.clamp(p.x, -edge, edge), y: base + h * 3, z: 0 }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    })

    const built = builtAt.current != null && t > builtAt.current + 0.6
    if (!built) return

    const all = bodies.current.filter(Boolean)
    if (!fell.current) {
      // Toppled once a couple of bricks are lying on the ground beside the base
      const onGround = (b) => b.translation().y < base + h * 0.9 && Math.abs(b.translation().x - baseX.current) > plankW / 2
      if (all.filter(onGround).length >= 2) {
        fell.current = true
        onState('toppled')
      }
    } else if (!held.current && all.length === ORDER.length) {
      // Rebuilt: every brick on the base or on each other, stacked tall, and still
      const onBase = all.every((b) => b.translation().y > base && Math.abs(b.translation().x - baseX.current) < plankW / 2 + h * 0.3)
      const tall = Math.max(...all.map((b) => b.translation().y)) > base + h * (ORDER.length - 1.5)
      const still = all.every((b) => { const v = b.linvel(); return Math.hypot(v.x, v.y, v.z) < 0.05 })
      if (onBase && tall && still) {
        fell.current = false
        onState('rebuilt')
      }
    }
  })

  return (
    <>
      <RigidBody ref={plank} type="kinematicPosition" colliders={false} position={[towerX, base, 0]}>
        <CuboidCollider args={[plankW / 2, h * 0.125, h]} friction={1} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[plankW, h * 0.25, h * 2]} />
          <meshStandardMaterial color={wood} roughness={0.7} />
        </mesh>
      </RigidBody>
      {bricks.slice(0, count).map((b, i) => (
        <Brick
          key={b.label}
          label={b.label}
          color={b.color}
          size={b.size}
          position={spawn.current[i]}
          rotation={(spin.current[i] ??= [0, b.yaw, 0])}
          register={(r) => { bodies.current[i] = r }}
          onGrab={grab(i)}
        />
      ))}
      {/* The ground the base stands on: nothing falls below it. The canvas edges hold the rest in. */}
      <CuboidCollider position={[0, base - h * 0.125 - 0.5, 0]} args={[view.width, 0.5, 4]} friction={0.9} />
      <ContactShadows position={[0, base - h * 0.125 + 0.002, 0]} opacity={0.32} scale={[view.width, 4]} blur={2.4} far={h * 3} color="#141312" />
      <CuboidCollider position={[-view.width / 2 - 0.5, 0, 0]} args={[0.5, view.height * 2, 4]} />
      <CuboidCollider position={[view.width / 2 + 0.5, 0, 0]} args={[0.5, view.height * 2, 4]} />
      {/* Front and back walls keep bricks in a shallow layer, so none drift out of view */}
      <CuboidCollider position={[0, 0, -1.6]} args={[view.width, view.height * 2, 0.5]} />
      <CuboidCollider position={[0, 0, 1.6]} args={[view.width, view.height * 2, 0.5]} />
    </>
  )
}

// onState('toppled' | 'rebuilt') lets the page change its handwritten note
export default function SkillTower({ onState = () => {} }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 12], fov: 30 }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
      onCreated={livePointer}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 9, 6]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]}>
          <Tower onState={onState} />
        </Physics>
      </Suspense>
      <Environment resolution={128}>
        <color attach="background" args={['#d9d2c4']} />
        <Lightformer form="rect" intensity={2.4} position={[0, 5, -6]} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-6, 1, 3]} scale={[2, 8, 1]} />
      </Environment>
    </Canvas>
  )
}
