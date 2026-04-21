import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function GaussianParticles() {
  const ref   = useRef()
  const count = 6000

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const sz  = new Float32Array(count)

    const W = 3.5, H = 2.8, D = 3.5

    for (let i = 0; i < count; i++) {
      const r = Math.random()

      if (r < 0.20) {
        // Floor — dense, warm grey
        pos[i*3]   = (Math.random()-0.5)*W*1.1
        pos[i*3+1] = -H/2 + Math.random()*0.08
        pos[i*3+2] = (Math.random()-0.5)*D*1.1
        col[i*3] = 0.65; col[i*3+1] = 0.62; col[i*3+2] = 0.58
        sz[i] = Math.random()*3+1

      } else if (r < 0.38) {
        // Back wall — light
        pos[i*3]   = (Math.random()-0.5)*W
        pos[i*3+1] = (Math.random()-0.5)*H
        pos[i*3+2] = -D/2 + Math.random()*0.08
        col[i*3] = 0.88; col[i*3+1] = 0.88; col[i*3+2] = 0.85
        sz[i] = Math.random()*2+0.5

      } else if (r < 0.50) {
        // Left wall
        pos[i*3]   = -W/2 + Math.random()*0.08
        pos[i*3+1] = (Math.random()-0.5)*H
        pos[i*3+2] = (Math.random()-0.5)*D
        col[i*3] = 0.75; col[i*3+1] = 0.75; col[i*3+2] = 0.72
        sz[i] = Math.random()*2+0.5

      } else if (r < 0.60) {
        // Bed — blue-grey cluster
        pos[i*3]   = (Math.random()-0.5)*1.6
        pos[i*3+1] = -H/2+0.25+Math.random()*0.35
        pos[i*3+2] = (Math.random()-0.5)*1.0-0.3
        col[i*3] = 0.40; col[i*3+1] = 0.42; col[i*3+2] = 0.52
        sz[i] = Math.random()*4+2

      } else if (r < 0.68) {
        // Wardrobe — dark brown
        pos[i*3]   = -W/2+0.25+Math.random()*0.5
        pos[i*3+1] = (Math.random()-0.5)*H*0.9
        pos[i*3+2] = -D/2+0.5+Math.random()*0.4
        col[i*3] = 0.22; col[i*3+1] = 0.16; col[i*3+2] = 0.12
        sz[i] = Math.random()*3+1.5

      } else if (r < 0.74) {
        // Window — bright white/yellow
        pos[i*3]   = (Math.random()-0.5)*1.1
        pos[i*3+1] = 0.4+Math.random()*0.7
        pos[i*3+2] = -D/2+0.04
        col[i*3] = 0.95; col[i*3+1] = 1.0; col[i*3+2] = 0.75
        sz[i] = Math.random()*3+1

      } else if (r < 0.80) {
        // Ceiling — very sparse
        pos[i*3]   = (Math.random()-0.5)*W
        pos[i*3+1] = H/2-Math.random()*0.12
        pos[i*3+2] = (Math.random()-0.5)*D
        col[i*3] = 0.9; col[i*3+1] = 0.9; col[i*3+2] = 0.9
        sz[i] = Math.random()*1.5+0.3

      } else {
        // Scatter / noise — very dim
        pos[i*3]   = (Math.random()-0.5)*W*1.3
        pos[i*3+1] = (Math.random()-0.5)*H*1.2
        pos[i*3+2] = (Math.random()-0.5)*D*1.3
        col[i*3] = 0.25; col[i*3+1] = 0.25; col[i*3+2] = 0.28
        sz[i] = Math.random()*1.5+0.2
      }
    }
    return [pos, col, sz]
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.y = t * 0.07
    ref.current.rotation.x = Math.sin(t*0.03) * 0.06
  })

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    g.setAttribute('size',     new THREE.BufferAttribute(sizes, 1))
    return g
  }, [positions, colors, sizes])

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  )
}

function RoomWireframe() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.getElapsedTime() * 0.07
    ref.current.rotation.x = Math.sin(clock.getElapsedTime()*0.03) * 0.06
  })

  return (
    <group ref={ref}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(3.5, 2.8, 3.5)]} />
        <lineBasicMaterial color="#c8ff00" transparent opacity={0.06} />
      </lineSegments>
    </group>
  )
}

export default function RoomScene() {
  return (
    <Canvas
      camera={{ position:[0, 0.5, 5.5], fov:45 }}
      style={{ background:'transparent' }}
      gl={{ antialias:true, alpha:true }}
    >
      <GaussianParticles />
      <RoomWireframe />
    </Canvas>
  )
}
