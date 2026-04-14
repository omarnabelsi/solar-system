import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'

function Spacecraft({ id, isSelected, onSelect, anchorRef }) {
  const { camera } = useThree()
  const craftRef = useRef(null)
  const shellRef = useRef(null)
  const worldPosRef = useRef(new THREE.Vector3())
  const [isHovered, setIsHovered] = useState(false)

  useCursor(isHovered)

  const handleSelect = (event) => {
    event.stopPropagation()
    onSelect(id)
  }

  useFrame((_, delta) => {
    if (!craftRef.current || !shellRef.current) {
      return
    }

    craftRef.current.rotation.y += 0.8 * delta
    craftRef.current.getWorldPosition(worldPosRef.current)

    const distance = camera.position.distanceTo(worldPosRef.current)
    const targetScale = THREE.MathUtils.clamp(1 + (distance - 90) / 800, 1, 1.28)
    const interactiveScale = isSelected || isHovered ? 1.1 : 1
    const nextScale = THREE.MathUtils.damp(
      shellRef.current.scale.x,
      targetScale * interactiveScale,
      8,
      delta,
    )
    shellRef.current.scale.setScalar(nextScale)
  })

  return (
    <group ref={anchorRef}>
      <group ref={shellRef}>
        <group
          ref={craftRef}
          onClick={handleSelect}
          onPointerOver={(event) => {
            event.stopPropagation()
            setIsHovered(true)
          }}
          onPointerOut={(event) => {
            event.stopPropagation()
            setIsHovered(false)
          }}
        >
          <mesh>
            <cylinderGeometry args={[0.15, 0.28, 1.8, 10]} />
            <meshStandardMaterial
              color="#d6dde8"
              metalness={0.72}
              roughness={0.3}
              emissive="#8fc0ff"
              emissiveIntensity={isSelected ? 0.6 : 0.2}
            />
          </mesh>

          <mesh position={[0, 0.85, 0]}>
            <coneGeometry args={[0.24, 0.55, 10]} />
            <meshStandardMaterial color="#f0f4fb" metalness={0.85} roughness={0.26} />
          </mesh>

          <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.38, 0.04, 12, 24]} />
            <meshStandardMaterial color="#7ea6dc" emissive="#5b8fd5" emissiveIntensity={0.45} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export default Spacecraft
