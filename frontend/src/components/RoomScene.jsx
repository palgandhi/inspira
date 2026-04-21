/**
 * RoomScene — Three.js animated particle cloud
 * Simulates what a Gaussian Splat looks like before it resolves
 * into a clear room. Particles slowly orbit and drift.
 */
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function GaussianParticles() {
  const meshRef  = useRef()
  const count    = 4000

  // Generate particles in a room-like distribution
  const [positions, colors, sizes] = useMemo(() => {
    const pos   = new Float32Array(count * 3)
    const col   = new Float32Array(count * 3)
    const sz    = new Float32Array(count)

    const roomW = 4, roomH = 3, roomD = 4

    for (let i = 0; i < count; i++) {
      const r = Math.random()

      if (r < 0.25) {
        // Floor
        pos[i*3]   = (Math.random() - 0.5) * roomW
        pos[i*3+1] = -roomH/2 + (Math.random() * 0.1)
        pos[i*3+2] = (Math.random() - 0.5) * roomD
        col[i*3]   = 0.6; col[i*3+1] = 0.55; col[i*3+2] = 0.5
      } else if (r < 0.5) {
        // Back wall
        pos[i*3]   = (Math.random() - 0.5) * roomW
        pos[i*3+1] = (Math.random() - 0.5) * roomH
        pos[i*3+2] = -roomD/2 + (Math.random() * 0.1)
        col[i*3]   = 0.85; col[i*3+1] = 0.85; col[i*3+2] = 0.82
      } else if (r < 0.65) {
        // Bed — warm tones
        pos[i*3]   = (Math.random() - 0.5) * 1.8
        pos[i*3+1] = -roomH/2 + 0.3 + Math.random() * 0.4
        pos[i*3+2] = (Math.random() - 0.5) * 1.2 - 0.5
        col[i*3]   = 0.35; col[i*3+1] = 0.35; col[i*3+2] = 0.45
      } else if (r < 0.78) {
        // Wardrobe — dark
        pos[i*3]   = -roomW/2 + 0.3 + Math.random() * 0.6
        pos[i*3+1] = (Math.random() - 0.5) * roomH * 0.8
        pos[i*3+2] = (Math.random() - 0.5) * 0.8
        col[i*3]   = 0.2; col[i*3+1] = 0.15; col[i*3+2] = 0.12
      } else if (r < 0.88) {
        // Window — bright
        pos[i*3]   = (Math.random() - 0.5) * 1.2
        pos[i*3+1] = 0.5 + Math.random() * 0.8
        pos[i*3+2] = -roomD/2 + 0.05
        col[i*3]   = 0.9; col[i*3+1] = 0.95; col[i*3+2] = 0.8
      } else {
        // Scattered noise
        pos[i*3]   = (Math.random() - 0.5) * roomW * 1.1
        pos[i*3+1] = (Math.random() - 0.5) * roomH * 1.1
        pos[i*3+2] = (Math.random() - 0.5) * roomD * 1.1
        col[i*3]   = 0.3; col[i*3+1] = 0.3; col[i*3+2] = 0.3
      }

      sz[i] = Math.random() * 2.5 + 0.5
    }
    return [pos, col, sz]
  }, [])

  // Slow rotation + subtle breathing animation
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.rotation.y = t * 0.08
    meshRef.current.rotation.x = Math.sin(t * 0.04) * 0.08
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, colors, sizes])

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  )
}

function WireframeRoom() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.getElapsedTime() * 0.08
  })

  return (
    <group ref={ref}>
      {/* Room box wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(4, 3, 4)]} />
        <lineBasicMaterial color="#c8ff00" transparent opacity={0.08} />
      </lineSegments>
      {/* Floor grid */}
      <gridHelper args={[4, 8, '#c8ff00', '#c8ff00']}
        position={[0, -1.5, 0]}
        material-opacity={0.06}
        material-transparent={true}
      />
    </group>
  )
}

export default function RoomScene() {
  return (
    <Canvas
      camera={{ position: [0, 1, 6], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <GaussianParticles />
      <WireframeRoom />
    </Canvas>
  )
}
