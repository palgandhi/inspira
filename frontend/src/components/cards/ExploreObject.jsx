import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ExploreObject() {
  const groupRef = useRef()
  const lensRef  = useRef()
  const beam1Ref = useRef()
  const beam2Ref = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.3
      groupRef.current.rotation.z = t * 0.08
    }
    if (lensRef.current) {
      lensRef.current.rotation.z = -t * 0.15
    }
    if (beam1Ref.current) {
      beam1Ref.current.rotation.z = t * 0.6
      beam1Ref.current.material.opacity = 0.3 + Math.sin(t * 1.2) * 0.15
    }
    if (beam2Ref.current) {
      beam2Ref.current.rotation.z = -t * 0.4
      beam2Ref.current.material.opacity = 0.2 + Math.sin(t * 0.9 + 1) * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {/* Outer ring — the eye */}
      <mesh>
        <ringGeometry args={[0.85, 0.92, 64]} />
        <meshBasicMaterial color="#c8ff00" transparent opacity={0.7} />
      </mesh>

      {/* Inner lens rings */}
      <group ref={lensRef}>
        {[0.6, 0.42, 0.28].map((r, i) => (
          <mesh key={i}>
            <ringGeometry args={[r, r + 0.02, 48]} />
            <meshBasicMaterial
              color="#c8ff00"
              transparent
              opacity={0.4 - i*0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Pupil */}
      <mesh>
        <circleGeometry args={[0.18, 32]} />
        <meshBasicMaterial color="#c8ff00" transparent opacity={0.5} />
      </mesh>

      {/* Scanning beams */}
      <mesh ref={beam1Ref}>
        <planeGeometry args={[2.0, 0.02]} />
        <meshBasicMaterial
          color="#c8ff00"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={beam2Ref} rotation={[0,0,Math.PI/3]}>
        <planeGeometry args={[2.0, 0.015]} />
        <meshBasicMaterial
          color="#c8ff00"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Tick marks around the ring */}
      {Array.from({length:12}).map((_,i) => {
        const angle = (i/12)*Math.PI*2
        const r = 1.02
        return (
          <mesh key={i}
            position={[Math.cos(angle)*r, Math.sin(angle)*r, 0]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.08, 0.015, 0.01]} />
            <meshBasicMaterial color="#c8ff00" transparent opacity={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}
