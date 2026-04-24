/**
 * FurnishedRoom — A clean, product-grade 3D furnished bedroom
 * Built from Three.js primitives — no external assets needed.
 * Designed to look like a real interior design visualization tool.
 */
import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows,
         RoundedBox, Float } from '@react-three/drei'
import * as THREE from 'three'

/* ── Materials ── */
const MAT = {
  wall:    <meshStandardMaterial color="#f5f0eb" roughness={0.9}/>,
  floor:   <meshStandardMaterial color="#c4a882" roughness={0.4} metalness={0.05}/>,
  bed:     <meshStandardMaterial color="#4a5568" roughness={0.8}/>,
  sheet:   <meshStandardMaterial color="#e8e0d5" roughness={0.9}/>,
  pillow:  <meshStandardMaterial color="#ffffff" roughness={1}/>,
  wood:    <meshStandardMaterial color="#7c5c3e" roughness={0.6}/>,
  darkwood:<meshStandardMaterial color="#2d1f14" roughness={0.5}/>,
  lamp:    <meshStandardMaterial color="#f0c060" roughness={0.3} metalness={0.4} emissive="#f0c060" emissiveIntensity={0.3}/>,
  metal:   <meshStandardMaterial color="#888" roughness={0.3} metalness={0.8}/>,
  glass:   <meshStandardMaterial color="#aaccff" transparent opacity={0.3} roughness={0}/>,
  plant:   <meshStandardMaterial color="#2d5a27" roughness={1}/>,
  rug:     <meshStandardMaterial color="#8b6f5e" roughness={1}/>,
  accent:  <meshStandardMaterial color="#c8ff00" roughness={0.5} metalness={0.2}/>,
}

function Room() {
  // Room dimensions: 5w × 3.2h × 4d
  const W=5, H=3.2, D=4

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0,-H/2,0]} receiveShadow>
        <planeGeometry args={[W, D]}/>
        {MAT.floor}
      </mesh>

      {/* Rug */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0.3,-H/2+0.01,-0.2]} receiveShadow>
        <planeGeometry args={[2.2, 1.4]}/>
        {MAT.rug}
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 0, -D/2]} receiveShadow>
        <planeGeometry args={[W, H]}/>
        {MAT.wall}
      </mesh>

      {/* Left wall */}
      <mesh rotation={[0, Math.PI/2, 0]} position={[-W/2, 0, 0]} receiveShadow>
        <planeGeometry args={[D, H]}/>
        {MAT.wall}
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI/2, 0, 0]} position={[0, H/2, 0]}>
        <planeGeometry args={[W, D]}/>
        <meshStandardMaterial color="#fafaf8" roughness={1}/>
      </mesh>

      {/* ── Window ── */}
      <group position={[1.2, 0.4, -D/2+0.02]}>
        {/* Window frame outer */}
        <mesh>
          <boxGeometry args={[1.4, 1.2, 0.06]}/>
          <meshStandardMaterial color="#e0d8cc" roughness={0.5}/>
        </mesh>
        {/* Glass pane */}
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[1.2, 1.0]}/>
          {MAT.glass}
        </mesh>
        {/* Window cross */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.04, 1.0, 0.02]}/>
          <meshStandardMaterial color="#d0c8bc" roughness={0.5}/>
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[1.2, 0.04, 0.02]}/>
          <meshStandardMaterial color="#d0c8bc" roughness={0.5}/>
        </mesh>
        {/* Light streaming in */}
        <pointLight position={[0, 0, 0.5]} intensity={0.8} color="#fff8e7" distance={3}/>
      </group>

      {/* ── Bed ── */}
      <group position={[-0.2, -H/2, -0.8]}>
        {/* Bed frame */}
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.36, 1.8]}/>
          {MAT.darkwood}
        </mesh>
        {/* Mattress */}
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[2.0, 0.2, 1.65]}/>
          {MAT.bed}
        </mesh>
        {/* Sheet */}
        <mesh position={[0, 0.55, 0.15]} castShadow>
          <boxGeometry args={[1.95, 0.06, 1.35]}/>
          {MAT.sheet}
        </mesh>
        {/* Pillows */}
        {[-0.5, 0.5].map((x,i) => (
          <mesh key={i} position={[x, 0.58, -0.6]} castShadow>
            <boxGeometry args={[0.7, 0.14, 0.45]}/>
            {MAT.pillow}
          </mesh>
        ))}
        {/* Headboard */}
        <mesh position={[0, 0.65, -0.92]} castShadow>
          <boxGeometry args={[2.2, 1.2, 0.08]}/>
          {MAT.darkwood}
        </mesh>
      </group>

      {/* ── Bedside table ── */}
      <group position={[1.1, -H/2, -0.8]}>
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.64, 0.45]}/>
          {MAT.wood}
        </mesh>
        {/* Drawer line */}
        <mesh position={[0, 0.32, 0.23]}>
          <boxGeometry args={[0.44, 0.02, 0.01]}/>
          {MAT.metal}
        </mesh>
        {/* Lamp */}
        <group position={[0, 0.64, 0]}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.32, 8]}/>
            {MAT.metal}
          </mesh>
          <mesh position={[0, 0.30, 0]}>
            <cylinderGeometry args={[0.0, 0.18, 0.22, 16]}/>
            {MAT.lamp}
          </mesh>
          <pointLight position={[0, 0.2, 0]} intensity={0.6} color="#ffd090" distance={2}/>
        </group>
      </group>

      {/* ── Wardrobe ── */}
      <group position={[-2.1, -H/2, -1.2]}>
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 2.1, 0.52]}/>
          {MAT.darkwood}
        </mesh>
        {/* Handles */}
        {[-0.14, 0.14].map((x,i) => (
          <mesh key={i} position={[x, 1.05, 0.27]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 8]}/>
            {MAT.metal}
          </mesh>
        ))}
        {/* Door gap line */}
        <mesh position={[0, 1.05, 0.27]}>
          <boxGeometry args={[0.01, 2.0, 0.01]}/>
          {MAT.metal}
        </mesh>
      </group>

      {/* ── Desk ── */}
      <group position={[1.8, -H/2, -1.4]}>
        {/* Desktop */}
        <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.04, 0.55]}/>
          {MAT.wood}
        </mesh>
        {/* Legs */}
        {[[-0.44, -0.44],[-0.44,0.22],[0.44,-0.44],[0.44,0.22]].map(([x,z],i) => (
          <mesh key={i} position={[x, 0.38, z]}>
            <boxGeometry args={[0.04, 0.76, 0.04]}/>
            {MAT.wood}
          </mesh>
        ))}
        {/* Monitor */}
        <group position={[0, 0.78, -0.18]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.58, 0.36, 0.03]}/>
            <meshStandardMaterial color="#1a1a1a" roughness={0.3}/>
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.08]}/>
            <meshStandardMaterial color="#222" roughness={0.5}/>
          </mesh>
          {/* Screen glow */}
          <mesh position={[0, 0.22, 0.018]}>
            <planeGeometry args={[0.52, 0.30]}/>
            <meshStandardMaterial color="#3a6fd8" emissive="#3a6fd8"
              emissiveIntensity={0.4} roughness={0}/>
          </mesh>
        </group>
      </group>

      {/* ── Plant ── */}
      <group position={[-2.1, -H/2, 0.8]}>
        {/* Pot */}
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.28, 12]}/>
          <meshStandardMaterial color="#c8a882" roughness={0.7}/>
        </mesh>
        {/* Plant body */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <sphereGeometry args={[0.3, 12, 10]}/>
          {MAT.plant}
        </mesh>
        <mesh position={[0.1, 0.72, 0.05]} castShadow>
          <sphereGeometry args={[0.18, 10, 8]}/>
          {MAT.plant}
        </mesh>
      </group>

      {/* ── Accent wall art ── */}
      <group position={[-0.6, 0.5, -D/2+0.03]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.8, 0.03]}/>
          <meshStandardMaterial color="#2a2a2a" roughness={0.5}/>
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.5, 0.68]}/>
          <meshStandardMaterial color="#c8ff00" roughness={0.5}
            emissive="#c8ff00" emissiveIntensity={0.15}/>
        </mesh>
      </group>

    </group>
  )
}

function Scene() {
  const groupRef = useRef()

  useFrame(({ clock, mouse }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    // Slow auto-rotate
    groupRef.current.rotation.y = -0.3 + Math.sin(t * 0.12) * 0.15
    // Subtle mouse parallax
    groupRef.current.rotation.x = mouse.y * 0.04 - 0.1
  })

  return (
    <group ref={groupRef}>
      <Room/>
    </group>
  )
}

export default function FurnishedRoom() {
  return (
    <Canvas
      camera={{ position:[2.5, 1.8, 4], fov:42 }}
      shadows
      style={{ background:'transparent' }}
      gl={{ antialias:true, alpha:true }}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.4}/>
        <directionalLight
          position={[3, 5, 3]}
          intensity={0.8}
          castShadow
          shadow-mapSize={[1024,1024]}
        />
        <pointLight position={[-2, 2, 2]} intensity={0.3} color="#fff0dd"/>

        <Scene/>

        <ContactShadows
          position={[0, -1.6, 0]}
          opacity={0.4}
          scale={8}
          blur={2}
          far={3}
          color="#000000"
        />
      </Suspense>
    </Canvas>
  )
}
