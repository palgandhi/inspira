import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function StyleObject() {
  const groupRef = useRef()
  const lineRefs = useRef([])

  // Neural network nodes layout
  const nodes = useMemo(() => [
    // Input layer
    {pos:[-1.2, 0.6, 0], layer:0},
    {pos:[-1.2, 0.0, 0], layer:0},
    {pos:[-1.2,-0.6, 0], layer:0},
    // Hidden layer
    {pos:[0, 0.8, 0], layer:1},
    {pos:[0, 0.0, 0], layer:1},
    {pos:[0,-0.8, 0], layer:1},
    {pos:[0, 1.4, 0.2], layer:1},
    // Output layer
    {pos:[1.2, 0.4, 0], layer:2},
    {pos:[1.2,-0.4, 0], layer:2},
  ], [])

  // Connections between layers
  const connections = useMemo(() => {
    const pairs = []
    nodes.forEach((n, i) => {
      nodes.forEach((m, j) => {
        if (m.layer === n.layer + 1) pairs.push([i, j])
      })
    })
    return pairs
  }, [nodes])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.4
      groupRef.current.rotation.x = Math.sin(t * 0.18) * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {/* Connections */}
      {connections.map(([i, j], k) => {
        const a = nodes[i].pos
        const b = nodes[j].pos
        const mid = [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2]
        const len = Math.sqrt(
          Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2)+Math.pow(b[2]-a[2],2)
        )
        const angle = Math.atan2(b[1]-a[1], b[0]-a[0])
        return (
          <mesh key={k} position={mid} rotation={[0, 0, angle]}>
            <boxGeometry args={[len, 0.008, 0.008]} />
            <meshBasicMaterial
              color="#c8ff00"
              transparent
              opacity={0.18}
            />
          </mesh>
        )
      })}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <mesh key={i} position={node.pos}>
          <sphereGeometry args={[0.10, 12, 12]} />
          <meshBasicMaterial
            color="#c8ff00"
            transparent
            opacity={node.layer === 1 ? 0.9 : 0.5}
          />
        </mesh>
      ))}

      {/* Pulse rings on nodes */}
      {nodes.filter(n=>n.layer===1).map((node, i) => (
        <mesh key={i} position={node.pos} rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[0.12, 0.14, 24]} />
          <meshBasicMaterial
            color="#c8ff00"
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}
