import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function UploadObject() {
  const groupRef = useRef()
  const innerRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.4
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.15
    }
    if (innerRef.current) {
      innerRef.current.rotation.z = t * 0.6
      innerRef.current.material.opacity = 0.4 + Math.sin(t * 1.5) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Outer frame */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.8, 1.4, 0.05)]} />
        <lineBasicMaterial color="#c8ff00" transparent opacity={0.8} />
      </lineSegments>

      {/* Corner accents */}
      {[[-0.8,0.6],[0.8,0.6],[-0.8,-0.6],[0.8,-0.6]].map(([x,y],i) => (
        <mesh key={i} position={[x, y, 0.03]}>
          <boxGeometry args={[0.15, 0.02, 0.01]} />
          <meshBasicMaterial color="#c8ff00" />
        </mesh>
      ))}

      {/* Inner rotating square */}
      <mesh ref={innerRef} position={[0, 0, 0.02]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshBasicMaterial
          color="#c8ff00"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center cross */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.6, 0.02, 0.01]} />
        <meshBasicMaterial color="#c8ff00" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.02, 0.4, 0.01]} />
        <meshBasicMaterial color="#c8ff00" transparent opacity={0.4} />
      </mesh>

      {/* Floating particles */}
      {Array.from({length:8}).map((_,i) => {
        const angle = (i/8)*Math.PI*2
        const r = 1.2
        return (
          <mesh key={i} position={[
            Math.cos(angle)*r,
            Math.sin(angle)*r*0.6,
            0
          ]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color="#c8ff00" transparent opacity={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}
