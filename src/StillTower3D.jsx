import { Suspense, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, RoundedBox, Text } from '@react-three/drei'
import { skills } from './data.js'
import { useTheme } from './theme.js'

// Phones: the same 3D skill bricks as the desktop tower, stacked and standing still.
// No physics and no touch handling, so it is light and never gets in the way of scrolling.
// It only redraws when something changes (frameloop "demand").
const COLORS = ['#141312', '#ff5a36', '#3d5afe', '#ffc531', '#f2ede4', '#ff5a36', '#3d5afe']
const FONT = '/fonts/bricolage-800.woff'
const H = 0.5 // brick height
const ORDER = [...skills].sort((a, b) => b.length - a.length) // widest at the bottom
const BASE_Y = -(ORDER.length * H) / 2 - 0.1

function Brick({ label, color, y, x, yaw, tilt }) {
  const invalidate = useThree((s) => s.invalidate)
  const w = H * (1.2 + label.length * 0.34)
  const d = H * 1.15
  const ink = color === '#ffc531' || color === '#f2ede4' ? '#141312' : '#f2ede4'
  return (
    <group position={[x, y, 0]} rotation={[0, yaw, tilt]}>
      <RoundedBox args={[w, H, d]} radius={H * 0.12} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.4} />
      </RoundedBox>
      <Text font={FONT} fontSize={H * 0.46} position={[0, 0, d / 2 + 0.005]} color={ink} anchorX="center" anchorY="middle" maxWidth={w * 0.92} onSync={invalidate}>
        {label}
      </Text>
    </group>
  )
}

function Stack() {
  const wood = useTheme() === 'dark' ? '#e9dcc6' : '#141312'
  // Hand-stacked look: each brick a little off-centre, twisted and tipped
  const bricks = useMemo(() => ORDER.map((label, i) => ({
    label,
    color: COLORS[i % COLORS.length],
    y: BASE_Y + 0.125 + H / 2 + i * H,
    x: (((i * 53) % 9) - 4) * 0.018,
    yaw: (((i * 37) % 11) - 5) * 0.035,
    tilt: (((i * 29) % 7) - 3) * 0.008,
  })), [])
  const plankW = H * (1.2 + ORDER[0].length * 0.34) + H * 0.8
  return (
    <group rotation={[0.12, -0.25, 0]}>
      <mesh position={[0, BASE_Y, 0]}>
        <boxGeometry args={[plankW, 0.25, H * 2]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      {bricks.map((b) => <Brick key={b.label} {...b} />)}
      <ContactShadows position={[0, BASE_Y - 0.13, 0]} opacity={0.35} scale={6} blur={2.4} far={2} color="#141312" frames={1} />
    </group>
  )
}

export default function StillTower3D() {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0.6, 9], fov: 30 }} gl={{ antialias: true, alpha: true }} style={{ pointerEvents: 'none' }}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 9, 6]} intensity={1.7} />
      <Suspense fallback={null}>
        <Stack />
      </Suspense>
      <Environment resolution={64} frames={1}>
        <color attach="background" args={['#d9d2c4']} />
        <Lightformer form="rect" intensity={2.4} position={[0, 5, -6]} scale={[12, 2, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-6, 1, 3]} scale={[2, 8, 1]} />
      </Environment>
    </Canvas>
  )
}
