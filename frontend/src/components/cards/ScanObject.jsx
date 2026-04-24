import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ScanObject() {
  const groupRef  = useRef()
  const beamRef   = useRef()
  const cloudRef  = useRef()

  const points = useMemo(() => {
    const pos = new Float32Array(2000 * 3)
    const col = new Float32Array(2000 * 3)
    for (let i = 0; i < 2000; i++) {
      // Distribute on a sphere surface
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 0.9 + Math.random() * 0.2
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i*3+2] = r * Math.cos(phi)
      // Colour: mostly accent, some white
      const bright = Math.random()
      col[i*3]   = bright > 0.8 ? 1.0 : 0.78
      col[i*3+1] = bright > 0.8 ? 1.0 : 1.0
      col[i*3+2] = bright > 0.8 ? 1.0 : 0.0
    }
    return { pos, col }
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(points.pos, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(points.col, 3))
    return g
  }, [points])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (cloudRef.current) cloudRef.current.rotation.y = t * 0.3
    if (beamRef.current) {
      beamRef.current.rotation.z = t * 1.2
      beamRef.current.material.opacity = 0.15 + Math.abs(Math.sin(t*1.5)) * 0.25
    }
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.12
    }
  })

  return (
    <group ref={groupRef}>
      {/* Point cloud sphere */}
      <points ref={cloudRef} geometry={geo}>
        <pointsMaterial
          size={0.025}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>

      {/* Scanning beam */}
      <mesh ref={beamRef}>
        <planeGeometry args={[2.4, 0.03]} />
        <meshBasicMaterial
          color="#c8ff00"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbit ring */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[1.05, 1.08, 64]} />
        <meshBasicMaterial color="#c8ff00" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}
