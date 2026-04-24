import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ReconstructObject() {
  const groupRef = useRef()
  const innerRef = useRef()
  const scanRef  = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.25
      groupRef.current.rotation.x = Math.sin(t * 0.18) * 0.1
    }
    if (scanRef.current) {
      // Vertical scan beam
      scanRef.current.position.y = Math.sin(t * 0.8) * 0.7
      scanRef.current.material.opacity = 0.12 + Math.abs(Math.sin(t*0.8)) * 0.2
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.5
    }
  })

  return (
    <group ref={groupRef}>
      {/* Room wireframe box */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.8, 1.4, 1.8)]} />
        <lineBasicMaterial color="#c8ff00" transparent opacity={0.5} />
      </lineSegments>

      {/* Floor grid */}
      <group position={[0, -0.7, 0]}>
        {Array.from({length:5}).map((_,i) => (
          <mesh key={`h${i}`} position={[0, 0, -0.8 + i*0.4]}>
            <boxGeometry args={[1.8, 0.005, 0.005]} />
            <meshBasicMaterial color="#c8ff00" transparent opacity={0.2} />
          </mesh>
        ))}
        {Array.from({length:5}).map((_,i) => (
          <mesh key={`v${i}`} position={[-0.8 + i*0.4, 0, 0]}>
            <boxGeometry args={[0.005, 0.005, 1.8]} />
            <meshBasicMaterial color="#c8ff00" transparent opacity={0.2} />
          </mesh>
        ))}
      </group>

      {/* Furniture suggestion — small box inside */}
      <group ref={innerRef}>
        <lineSegments position={[0.3, -0.3, 0.2]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.6, 0.4, 0.5)]} />
          <lineBasicMaterial color="#c8ff00" transparent opacity={0.6} />
        </lineSegments>
      </group>

      {/* Horizontal scan plane */}
      <mesh ref={scanRef}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial
          color="#c8ff00"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Corner dots */}
      {[[-0.9,0.7,-0.9],[0.9,0.7,-0.9],[-0.9,0.7,0.9],[0.9,0.7,0.9],
        [-0.9,-0.7,-0.9],[0.9,-0.7,-0.9],[-0.9,-0.7,0.9],[0.9,-0.7,0.9]
      ].map((pos,i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#c8ff00" />
        </mesh>
      ))}
    </group>
  )
}
