import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

function GlassForm() {
  const meshRef = useRef()

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.rotation.y = t * 0.15
    meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.08
  })

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.5}>
      <group ref={meshRef}>

        {/* Main body — warm terracotta/sand fill */}
        <mesh>
          <icosahedronGeometry args={[1.2, 1]}/>
          <meshStandardMaterial
            color="#c4a882"
            roughness={0.4}
            metalness={0.05}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Wireframe — dark warm brown */}
        <mesh>
          <icosahedronGeometry args={[1.21, 1]}/>
          <meshBasicMaterial
            color="#7a6248"
            wireframe
            transparent
            opacity={0.55}
          />
        </mesh>

        {/* Inner form — amber */}
        <mesh rotation={[0.5, 0.3, 0]}>
          <octahedronGeometry args={[0.6]}/>
          <meshStandardMaterial
            color="#d4a870"
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inner wireframe */}
        <mesh rotation={[0.5, 0.3, 0]}>
          <octahedronGeometry args={[0.61]}/>
          <meshBasicMaterial
            color="#8a6840"
            wireframe
            transparent
            opacity={0.65}
          />
        </mesh>

        {/* Orbital ring — warm gold */}
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[1.7, 0.008, 8, 100]}/>
          <meshBasicMaterial
            color="#b89060"
            transparent
            opacity={0.5}
          />
        </mesh>

        {/* Second ring — tilted */}
        <mesh rotation={[Math.PI/3, Math.PI/5, 0]}>
          <torusGeometry args={[1.7, 0.005, 8, 100]}/>
          <meshBasicMaterial
            color="#c0a070"
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Vertex dots — amber */}
        {[
          [0, 1.45, 0], [0, -1.45, 0],
          [1.45, 0, 0], [-1.45, 0, 0],
          [0, 0, 1.45], [0, 0, -1.45],
        ].map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.05, 8, 8]}/>
            <meshBasicMaterial color="#9a7850" transparent opacity={0.7}/>
          </mesh>
        ))}
      </group>
    </Float>
  )
}

export default function FloatingObject() {
  return (
    <Canvas
      camera={{ position:[0, 0, 4.5], fov:38 }}
      style={{ background:'transparent' }}
      gl={{ antialias:true, alpha:true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={1.2}/>
        <directionalLight position={[4, 6, 4]} intensity={1.0} color="#f5ead8"/>
        <directionalLight position={[-3, -2, -2]} intensity={0.4} color="#e8d5b0"/>
        <pointLight position={[2, 2, 2]} intensity={0.6} color="#f0d090"/>
      </Suspense>
      <GlassForm/>
    </Canvas>
  )
}
