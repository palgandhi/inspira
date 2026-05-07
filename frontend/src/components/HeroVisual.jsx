/**
 * HeroVisual — Abstract 3D spatial intelligence visualization
 * 
 * Concept: A morphing grid that represents AI understanding of space.
 * Not a room — the idea of space being analyzed.
 * 
 * Elements:
 * - Undulating mesh plane (like space being scanned)
 * - Floating geometric primitives (data points)
 * - Scanning beam effect
 * - Coordinate grid that breathes
 */
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ── Undulating Grid Mesh ── */
function MorphingGrid() {
  const meshRef   = useRef()
  const geoRef    = useRef()
  const size      = 24
  const segments  = 32

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size, segments, segments)
  }, [])

  useFrame(({ clock }) => {
    if (!geoRef.current) return
    const t    = clock.getElapsedTime()
    const pos  = geoRef.current.attributes.position
    const count = pos.count

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      // Wave function — multiple overlapping sine waves
      const z =
        Math.sin(x * 0.5 + t * 0.6) * 0.3 +
        Math.sin(y * 0.4 + t * 0.4) * 0.4 +
        Math.sin((x + y) * 0.3 + t * 0.5) * 0.2 +
        Math.sin(Math.sqrt(x*x + y*y) * 0.4 - t * 0.8) * 0.5
      pos.setZ(i, z)
    }
    pos.needsUpdate = true
    geoRef.current.computeVertexNormals()
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2.2, 0, 0]}
      position={[0, -1.5, 0]}
    >
      <primitive object={geometry} ref={geoRef} attach="geometry"/>
      <meshBasicMaterial
        color="#c8ff00"
        wireframe
        transparent
        opacity={0.12}
      />
    </mesh>
  )
}

/* ── Floating geometric shapes ── */
function FloatingShapes() {
  const shapes = useMemo(() => [
    { pos:[2.5,  0.5, 0.5],  type:'box',   size:0.3,  speed:0.7, phase:0 },
    { pos:[-2.0, 1.2, -0.5], type:'oct',   size:0.22, speed:0.5, phase:1.2 },
    { pos:[0.8,  -0.3, 1.2], type:'box',   size:0.18, speed:0.9, phase:2.4 },
    { pos:[-1.2, 0.8, 0.8],  type:'oct',   size:0.28, speed:0.6, phase:0.8 },
    { pos:[3.0,  -0.5,-0.5], type:'box',   size:0.14, speed:1.1, phase:3.1 },
    { pos:[-3.0, 0.2, 0.2],  type:'oct',   size:0.20, speed:0.8, phase:1.8 },
    { pos:[1.5, -1.0, -1.0], type:'box',   size:0.16, speed:0.65,phase:4.2 },
    { pos:[-0.5, 1.5, -1.0], type:'oct',   size:0.25, speed:0.75,phase:5.0 },
  ], [])

  const refs = useMemo(() => shapes.map(() => React.createRef()), [shapes])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    refs.forEach((ref, i) => {
      if (!ref.current) return
      const s = shapes[i]
      ref.current.position.y = s.pos[1] + Math.sin(t * s.speed + s.phase) * 0.15
      ref.current.rotation.x = t * 0.3 * (i%2===0 ? 1 : -1)
      ref.current.rotation.y = t * 0.4 * (i%2===0 ? 1 : -1)
    })
  })

  return (
    <>
      {shapes.map((s, i) => (
        <mesh
          key={i}
          ref={refs[i]}
          position={s.pos}
        >
          {s.type === 'box'
            ? <boxGeometry args={[s.size, s.size, s.size]}/>
            : <octahedronGeometry args={[s.size]}/>
          }
          <meshBasicMaterial
            color="#c8ff00"
            wireframe
            transparent
            opacity={0.35}
          />
        </mesh>
      ))}
    </>
  )
}

/* ── Scanning beam ── */
function ScanBeam() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.z = Math.sin(t * 0.4) * 5
    ref.current.material.opacity = 0.06 + Math.abs(Math.sin(t * 0.4)) * 0.06
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI/2, 0, 0]} position={[0, 2, 0]}>
      <planeGeometry args={[24, 0.04]}/>
      <meshBasicMaterial color="#c8ff00" transparent opacity={0.08}/>
    </mesh>
  )
}

/* ── Vertical scanning lines ── */
function GridLines() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.getElapsedTime() * 0.02
  })
  return (
    <group ref={ref}>
      {/* Vertical coordinate axis */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 8, 4]}/>
        <meshBasicMaterial color="#c8ff00" transparent opacity={0.2}/>
      </mesh>
      {/* Horizontal rings */}
      {[-1, 0, 1].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[3.8, 3.82, 64]}/>
          <meshBasicMaterial color="#c8ff00" transparent opacity={0.06}/>
        </mesh>
      ))}
    </group>
  )
}

/* ── Scene wrapper ── */
function Scene() {
  const groupRef = useRef()
  useFrame(({ mouse }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += (mouse.x * 0.08 - groupRef.current.rotation.y) * 0.03
    groupRef.current.rotation.x += (-mouse.y * 0.04 - groupRef.current.rotation.x) * 0.03
  })
  return (
    <group ref={groupRef}>
      <MorphingGrid/>
      <FloatingShapes/>
      <ScanBeam/>
      <GridLines/>
    </group>
  )
}

// Need React import for createRef
import React from 'react'

export default function HeroVisual() {
  return (
    <Canvas
      camera={{ position:[0, 3, 8], fov:50 }}
      style={{ background:'transparent' }}
      gl={{ antialias:true, alpha:true }}
    >
      <Scene/>
    </Canvas>
  )
}
