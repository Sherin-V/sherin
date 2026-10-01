import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import drops from './assets/block-drops.json'

// Each word falls onto its own toy shelf. The motion is real rigid-body physics
// (gravity, bounces, friction, no steering), simulated ahead of time; from many random
// throws only the ones that happened to land readable were kept, and one is picked per visit.
const COLORS = ['#ff5a36', '#3d5afe', '#ffc531', '#141312']
const FONT = '/fonts/bricolage-800.woff'
const SHELF_RISE = 1.75 // top shelf height above the bottom one, in block sizes
const SHELF_BACK = 2.4 // top shelf sits further back so falling blocks pass in front of it

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

function useLayout() {
  const { viewport } = useThree()
  const widest = Math.max(...drops.words.map((w) => w.length)) * drops.gap + 0.6
  const size = Math.min(1.3, (viewport.width * 0.9) / widest, (viewport.height * 0.4) / (SHELF_RISE + 1.2))
  // Bottom shelf a little below the middle; the pair is centred around the hero
  const base = viewport.height * 0.02 - ((SHELF_RISE + 1) * size) / 2
  return { size, base }
}

function Block({ letter, color, index, run }) {
  const ref = useRef()
  const ink = color === '#ffc531' ? '#141312' : '#f2ede4'
  const [frontFace, turns] = run.faces[index]
  const qa = useMemo(() => new THREE.Quaternion(), [])
  const qb = useMemo(() => new THREE.Quaternion(), [])
  const start = useRef(null)

  // Play back the recorded fall, smoothly between recorded frames
  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime
    const f = (clock.elapsedTime - start.current) * drops.fps
    const last = run.frames.length - 1
    const i = Math.min(Math.floor(f), last)
    const j = Math.min(i + 1, last)
    const a = run.frames[i]
    const b = run.frames[j]
    const t = i === last ? 0 : f - i
    const o = index * 7
    ref.current.position.set(
      THREE.MathUtils.lerp(a[o], b[o], t),
      THREE.MathUtils.lerp(a[o + 1], b[o + 1], t),
      THREE.MathUtils.lerp(a[o + 2], b[o + 2], t),
    )
    qa.set(a[o + 3], a[o + 4], a[o + 5], a[o + 6])
    qb.set(b[o + 3], b[o + 4], b[o + 5], b[o + 6])
    ref.current.quaternion.slerpQuaternions(qa, qb, t)
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

function Shelf({ word, colorOffset, run }) {
  const length = word.length * drops.gap + 0.5
  return (
    <group>
      <mesh position={[0, -0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[length, 0.12, 2.3]} />
        <meshStandardMaterial color="#141312" roughness={0.6} />
      </mesh>
      {word.split('').map((letter, i) => (
        <Block key={i} index={i} letter={letter} color={COLORS[(i + colorOffset) % COLORS.length]} run={run} />
      ))}
    </group>
  )
}

function Toybox() {
  const { size, base } = useLayout()
  const [top, bottom] = drops.words
  // A different real fall on every visit
  const runs = useMemo(() => ({ top: pick(drops.runs[top]), bottom: pick(drops.runs[bottom]) }), [top, bottom])
  return (
    <group scale={size} position={[0, base, 0]}>
      <group position={[0, SHELF_RISE, -SHELF_BACK]}>
        <Shelf word={top} colorOffset={0} run={runs.top} />
      </group>
      <Shelf word={bottom} colorOffset={2} run={runs.bottom} />
    </group>
  )
}

export default function BlocksScene() {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 0, 13], fov: 32 }} gl={{ antialias: true, alpha: true }}>
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
  )
}
