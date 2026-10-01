import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard, Environment, Lightformer, Text } from '@react-three/drei'
import { Physics, RigidBody, BallCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { skills } from './data.js'


const LABEL_RADIUS = 0.95

const COLORS = ['#ff5a36', '#3d5afe', '#ffc531', '#f2ede4', '#ff5a36', '#3d5afe']

const geometries = {
  sphere: new THREE.SphereGeometry(0.36, 48, 48),
  capsule: new THREE.CapsuleGeometry(0.2, 0.42, 12, 32),
  torus: new THREE.TorusGeometry(0.3, 0.13, 32, 64),
  box: new THREE.BoxGeometry(0.52, 0.52, 0.52, 4, 4, 4),
}
const kinds = Object.keys(geometries)
const labelGeometry = new THREE.SphereGeometry(LABEL_RADIUS, 64, 64)

// Where the clump gathers: the empty right column of About on wide screens, the bottom on phones
function useTarget() {
  const { viewport } = useThree()
  return viewport.aspect > 1.1
    ? [viewport.width * 0.3, 0, 0]
    : [0, -viewport.height * 0.3, 0]
}

const DARK_TEXT = new Set(['#ffc531', '#f2ede4'])

// A big ball with a skill name that always faces the camera
function Label({ text, color, radius }) {
  const size = Math.min(0.34, (radius * 2.6) / Math.max(text.length, 3))
  return (
    <Billboard>
      <Text
        font="/fonts/bricolage-800.woff"
        fontSize={size}
        letterSpacing={-0.03}
        position={[0, 0, radius + 0.02]}
        color={DARK_TEXT.has(color) ? '#141312' : '#f2ede4'}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </Billboard>
  )
}

function Body({ kind, color, position, burst, label }) {
  const api = useRef()
  const target = useTarget()
  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const body = api.current
    if (!body) return
    const p = body.translation()
    v.set(target[0] - p.x, target[1] - p.y, target[2] - p.z)
    if (burst.current > 0) {
      // Clicked: throw everything outward for a moment
      v.negate().normalize().multiplyScalar((0.9 + Math.random()) * body.mass())
    } else {
      v.multiplyScalar(0.35 * Math.min(delta, 0.1) * 12 * body.mass())
    }
    body.applyImpulse(v, true)
  })

  return (
    <RigidBody
      ref={api}
      position={position}
      colliders={label ? false : kind === 'sphere' ? 'ball' : 'hull'}
      linearDamping={3.5}
      angularDamping={0.8}
      friction={0.2}
      restitution={0.4}
    >
      {label ? (
        <>
          <BallCollider args={[LABEL_RADIUS]} />
          <mesh geometry={labelGeometry} castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={0.42} metalness={0} />
          </mesh>
          <Label text={label} color={color} radius={LABEL_RADIUS} />
        </>
      ) : (
        <mesh geometry={geometries[kind]} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.42} metalness={0} />
        </mesh>
      )}
    </RigidBody>
  )
}

function Pointer() {
  const ref = useRef()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ pointer, viewport }) => {
    ref.current?.setNextKinematicTranslation(v.set((pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2, 0))
  })
  return (
    <RigidBody type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[0.9]} />
    </RigidBody>
  )
}

function Clump() {
  const burst = useRef(0)
  const bodies = useMemo(() => {
    const spread = () => [THREE.MathUtils.randFloatSpread(14), THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(4)]
    const labelled = skills.map((label, i) => ({ label, kind: 'sphere', color: COLORS[i % COLORS.length], position: spread() }))
    const fillers = Array.from({ length: 10 }, (_, i) => ({
      kind: kinds[i % kinds.length],
      color: COLORS[(i + 2) % COLORS.length],
      position: spread(),
    }))
    return [...labelled, ...fillers]
  }, [])

  useEffect(() => {
    const onDown = (e) => {
      if (e.target.closest('a, button, input, textarea')) return
      const r = document.getElementById('about')?.getBoundingClientRect()
      if (!r || e.clientY < r.top || e.clientY > r.bottom) return
      burst.current = 1
      setTimeout(() => { burst.current = 0 }, 90)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  return bodies.map((b, i) => <Body key={i} {...b} burst={burst} />)
}

export default function SkillsScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 14], fov: 32 }}
      eventSource={document.getElementById('root')}
      eventPrefix="client"
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <spotLight position={[10, 14, 12]} angle={0.3} penumbra={1} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <Physics gravity={[0, 0, 0]}>
        <Pointer />
        <Clump />
      </Physics>
      {/* Plain white studio light, built locally */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} position={[0, 6, -4]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 0, 4]} scale={[3, 8, 1]} />
        <Lightformer form="circle" intensity={1.5} position={[6, 2, 6]} scale={3} />
      </Environment>
    </Canvas>
  )
}
