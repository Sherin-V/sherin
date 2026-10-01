import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows, Environment, Float, Lightformer, MeshDistortMaterial,
  MeshTransmissionMaterial, RoundedBox, Text,
} from '@react-three/drei'
import * as THREE from 'three'


// Shared helper: rotate a group gently toward the pointer
function usePointerTilt(ref, strength = [0.35, 0.25]) {
  useFrame((state, delta) => {
    const g = ref.current
    if (!g) return
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * strength[0], 3, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * strength[1], 3, delta)
  })
}

// Sit to the right of the big name on wide screens
function useOffset(amount = 0.16) {
  const { viewport } = useThree()
  return viewport.aspect > 1.1 ? viewport.width * amount : 0
}

/* 1 — Candy glass: glass knot with glossy candy shapes */
const candyShapes = [
  { geo: <sphereGeometry args={[0.9, 64, 64]} />, color: '#ff4fa3', pos: [-3.6, 1.4, -1], speed: 1.6 },
  { geo: <torusGeometry args={[0.7, 0.28, 48, 96]} />, color: '#ffb02e', pos: [3.4, 1.8, -0.5], speed: 2 },
  { geo: <icosahedronGeometry args={[0.8, 0]} />, color: '#22d3ee', pos: [-2.8, -1.9, 0.2], speed: 1.4 },
  { geo: <capsuleGeometry args={[0.35, 0.9, 16, 32]} />, color: '#c6ff3d', pos: [3.1, -1.6, 0.4], speed: 1.8 },
  { geo: <octahedronGeometry args={[0.55, 0]} />, color: '#7b5cff', pos: [0.6, 2.6, -2], speed: 2.2 },
  { geo: <sphereGeometry args={[0.4, 48, 48]} />, color: '#ff8a3d', pos: [-0.9, -2.7, -1], speed: 2.4 },
  { geo: <dodecahedronGeometry args={[0.5, 0]} />, color: '#ff4fa3', pos: [5.4, 0.2, -2.5], speed: 1.5 },
  { geo: <torusGeometry args={[0.45, 0.17, 32, 64]} />, color: '#22d3ee', pos: [-5.4, -0.2, -2.5], speed: 1.9 },
]

function Candy() {
  const group = useRef()
  const glass = useRef()
  const x = useOffset()
  usePointerTilt(group)
  useFrame((_, delta) => {
    glass.current.rotation.x += delta * 0.25
    glass.current.rotation.y += delta * 0.35
  })
  return (
    <group position={[x, 0, 0]}>
      <group ref={group}>
        <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.8}>
          <mesh ref={glass} scale={1.15}>
            <torusKnotGeometry args={[1, 0.36, 220, 40]} />
            <MeshTransmissionMaterial samples={6} resolution={512} thickness={1.2} roughness={0.05}
              chromaticAberration={0.6} anisotropy={0.3} distortion={0.4} distortionScale={0.4}
              temporalDistortion={0.15} iridescence={1} iridescenceIOR={1.3} color="#ffffff" backside />
          </mesh>
        </Float>
        {candyShapes.map((s, i) => (
          <Float key={i} speed={s.speed} rotationIntensity={1.6} floatIntensity={1.6}>
            <mesh position={s.pos}>
              {s.geo}
              <meshPhysicalMaterial color={s.color} roughness={0.15} metalness={0.1} clearcoat={1}
                clearcoatRoughness={0.1} iridescence={0.6} iridescenceIOR={1.4} />
            </mesh>
          </Float>
        ))}
      </group>
      <ContactShadows position={[0, -3.4, 0]} opacity={0.35} scale={18} blur={2.8} far={5} color="#7b5cff" />
    </group>
  )
}

/* 2 — Liquid chrome: one big morphing mirror blob */
function Chrome() {
  const group = useRef()
  const x = useOffset(0.18)
  usePointerTilt(group, [0.6, 0.4])
  return (
    <group position={[x, 0, 0]}>
      <group ref={group}>
        <Float speed={2} floatIntensity={1.2} rotationIntensity={0.4}>
          <mesh scale={2.3}>
            <icosahedronGeometry args={[1, 64]} />
            <MeshDistortMaterial color="#c9d4ff" metalness={1} roughness={0.08} distort={0.45} speed={1.6} envMapIntensity={1.4} />
          </mesh>
        </Float>
        {[[-2.9, 1.7, -1, 0.35], [2.6, -1.9, 0.5, 0.25], [2.9, 2, -1.5, 0.18]].map(([px, py, pz, s], i) => (
          <Float key={i} speed={3} floatIntensity={2}>
            <mesh position={[px, py, pz]} scale={s}>
              <sphereGeometry args={[1, 48, 48]} />
              <meshStandardMaterial color="#e6ecff" metalness={1} roughness={0.05} />
            </mesh>
          </Float>
        ))}
      </group>
    </group>
  )
}

/* 3 — Toy blocks: SHERIN spelled out on chunky tumbling blocks */
const BLOCK_COLORS = ['#ff5a36', '#3d5afe', '#ffc531', '#141312', '#ff5a36', '#3d5afe']
// Fit the 3×2 block grid (about 4.9 units wide) into the free space beside the name:
// the right third on wide screens, above the name on phones.
function useBlocksLayout() {
  const { viewport } = useThree()
  const { width, height, aspect } = viewport
  if (aspect > 1.1) {
    const room = width * 0.34
    return { scale: Math.min(1, room / 4.9), position: [width / 2 - room / 2 - width * 0.07, 0.2, 0] }
  }
  const room = width * 0.8
  return { scale: Math.min(0.8, room / 4.9), position: [0, height * 0.17, 0] }
}

function Blocks() {
  const group = useRef()
  const layout = useBlocksLayout()
  usePointerTilt(group, [0.5, 0.3])
  const letters = 'SHERIN'.split('')
  return (
    <group position={layout.position} scale={layout.scale}>
    <group ref={group}>
      {letters.map((l, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        const color = BLOCK_COLORS[i]
        return (
          <Float key={i} speed={1.5 + i * 0.2} rotationIntensity={1.1} floatIntensity={1.2}>
            <group position={[(col - 1) * 1.55, (0.5 - row) * 1.6, Math.sin(i) * 0.4]} rotation={[0.15 * (i % 2 ? 1 : -1), -0.25 + i * 0.12, 0.08 * (i - 2)]}>
              <RoundedBox args={[1.3, 1.3, 1.3]} radius={0.16} smoothness={6} castShadow>
                <meshStandardMaterial color={color} roughness={0.35} />
              </RoundedBox>
              <Text font="/fonts/bricolage-800.woff" fontSize={0.95} position={[0, -0.04, 0.66]}
                color={color === '#ffc531' ? '#141312' : '#f2ede4'} anchorX="center" anchorY="middle">
                {l}
              </Text>
            </group>
          </Float>
        )
      })}
    </group>
      <ContactShadows position={[0, -2.6, 0]} opacity={0.3} scale={14} blur={2.5} far={4} color="#141312" />
    </group>
  )
}

/* 4 — Ring tunnel: rings twisting in a travelling wave */
function Rings() {
  const group = useRef()
  const rings = useRef([])
  const x = useOffset(0.16)
  usePointerTilt(group, [0.5, 0.35])
  const count = 18
  const colors = useMemo(() => Array.from({ length: count }, (_, i) =>
    new THREE.Color().setHSL(0.72 - (i / count) * 0.28, 0.85, 0.6)), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    rings.current.forEach((m, i) => {
      if (!m) return
      m.rotation.x = Math.sin(t * 0.8 + i * 0.35) * 0.9
      m.rotation.y = Math.cos(t * 0.6 + i * 0.35) * 0.9
    })
  })
  return (
    <group position={[x, 0, 0]} ref={group}>
      {colors.map((c, i) => {
        const r = 0.6 + i * 0.16
        return (
          <mesh key={i} ref={(m) => (rings.current[i] = m)}>
            <torusGeometry args={[r, 0.035, 16, 128]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.55} metalness={0.4} roughness={0.25} />
          </mesh>
        )
      })}
    </group>
  )
}

/* 5 — Particle wave: a field of points rippling toward the pointer */
function Wave() {
  const points = useRef()
  const { size } = useThree()
  const cols = 120
  const rows = 60
  const positions = useMemo(() => {
    const arr = new Float32Array(cols * rows * 3)
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const k = (i * rows + j) * 3
      arr[k] = (i - cols / 2) * 0.16
      arr[k + 2] = (j - rows / 2) * 0.16
    }
    return arr
  }, [])
  const colors = useMemo(() => {
    const arr = new Float32Array(cols * rows * 3)
    const a = new THREE.Color('#3dffa8')
    const b = new THREE.Color('#1e7bff')
    for (let i = 0; i < cols * rows; i++) {
      const c = a.clone().lerp(b, (i % rows) / rows)
      arr.set([c.r, c.g, c.b], i * 3)
    }
    return arr
  }, [])
  useFrame(({ clock, pointer }) => {
    const t = clock.elapsedTime
    const pos = points.current.geometry.attributes.position
    const px = pointer.x * 9
    const pz = -pointer.y * 4
    for (let i = 0; i < cols * rows; i++) {
      const x = pos.array[i * 3]
      const z = pos.array[i * 3 + 2]
      const d = Math.hypot(x - px, z - pz)
      pos.array[i * 3 + 1] = Math.sin(x * 0.6 + t * 1.4) * 0.35 + Math.cos(z * 0.8 + t) * 0.25 + Math.exp(-d * 0.6) * 1.4 * Math.sin(t * 3 - d * 2)
    }
    pos.needsUpdate = true
  })
  return (
    <points ref={points} position={[0, -1.6, -1]} rotation={[0.35, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size.width < 700 ? 0.06 : 0.045} vertexColors sizeAttenuation transparent opacity={0.95} />
    </points>
  )
}

/* 6 — Gold sculpture: polished gold knot with matte marble spheres */
function Gold() {
  const group = useRef()
  const knot = useRef()
  const x = useOffset(0.17)
  usePointerTilt(group)
  useFrame((_, delta) => { knot.current.rotation.z += delta * 0.2 })
  return (
    <group position={[x, 0, 0]} ref={group}>
      <Float speed={1.2} floatIntensity={0.6}>
        <mesh ref={knot} scale={1.25}>
          <torusKnotGeometry args={[1, 0.3, 256, 48, 3, 4]} />
          <meshStandardMaterial color="#e8b04a" metalness={1} roughness={0.18} />
        </mesh>
      </Float>
      {[[-2.8, 1.5, -0.5, 0.55, '#f6ead6'], [2.7, -1.6, 0.4, 0.42, '#3a2a1c'], [2.4, 2, -1, 0.3, '#f6ead6'], [-2.2, -2, 0.6, 0.25, '#e8b04a']].map(([px, py, pz, s, c], i) => (
        <Float key={i} speed={1.8 + i * 0.3} floatIntensity={1.4}>
          <mesh position={[px, py, pz]} scale={s}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshStandardMaterial color={c} metalness={c === '#e8b04a' ? 1 : 0} roughness={c === '#e8b04a' ? 0.2 : 0.6} />
          </mesh>
        </Float>
      ))}
      <ContactShadows position={[0, -3.2, 0]} opacity={0.5} scale={14} blur={2.6} far={5} color="#000" />
    </group>
  )
}

const SCENES = { candy: Candy, chrome: Chrome, blocks: Blocks, rings: Rings, wave: Wave, gold: Gold }

// Studio light per look, built locally so nothing has to be downloaded
const LIGHTS = {
  candy: ['#ffffff', '#ff4fa3', '#22d3ee', '#ffb02e'],
  chrome: ['#ffffff', '#ff4fa3', '#5ee7ff', '#7b5cff'],
  blocks: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
  rings: ['#ffffff', '#9b7bff', '#ff4fa3', '#5ee7ff'],
  wave: ['#ffffff', '#3dffa8', '#1e7bff', '#ffffff'],
  gold: ['#fff4e0', '#ffcf8a', '#ffffff', '#ffb35c'],
}

// Base colour the shiny looks reflect, so mirrors are not just black
const ENV_BG = { chrome: '#33407e', gold: '#4a3218', blocks: '#d9d2c4' }

export default function HeroScene({ variant = 'candy' }) {
  const Look = SCENES[variant] ?? Candy
  const [top, left, right, front] = LIGHTS[variant] ?? LIGHTS.candy
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 8], fov: 42 }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={variant === 'blocks' ? 0.9 : 0.4} />
      <directionalLight position={[5, 6, 4]} intensity={2} castShadow />
      <Suspense fallback={null}><Look key={variant} /></Suspense>
      <Environment key={`env-${variant}`} resolution={256}>
        {ENV_BG[variant] && <color attach="background" args={[ENV_BG[variant]]} />}
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[12, 2, 1]} color={top} />
        <Lightformer form="rect" intensity={4} position={[-6, 1, 2]} scale={[2, 8, 1]} color={left} />
        <Lightformer form="rect" intensity={4} position={[6, -1, 2]} scale={[2, 8, 1]} color={right} />
        <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={4} color={front} />
      </Environment>
    </Canvas>
  )
}
