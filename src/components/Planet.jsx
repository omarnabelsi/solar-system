import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'

function toRgba(hexColor, alpha) {
  const color = new THREE.Color(hexColor)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')'
}

function createPlaceholderTexture(baseColor, detailColor) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, baseColor)
  gradient.addColorStop(1, detailColor)
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const stripeColor = toRgba(detailColor, 0.4)
  for (let i = 0; i < 24; i += 1) {
    const y = (i / 24) * canvas.height
    const wave = Math.sin(i * 0.6) * 10
    context.fillStyle = stripeColor
    context.fillRect(0, y + wave, canvas.width, 8)
  }

  for (let i = 0; i < 240; i += 1) {
    context.fillStyle = toRgba('#ffffff', Math.random() * 0.15)
    context.beginPath()
    context.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 2,
      0,
      Math.PI * 2,
    )
    context.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.set(2, 1)
  texture.needsUpdate = true

  return texture
}

function Planet({
  id,
  size,
  primaryColor,
  secondaryColor,
  axialSpeed,
  tilt = 0,
  ring = null,
  isSelected = false,
  onSelect,
}) {
  const planetRef = useRef(null)
  const visualRef = useRef(null)
  const worldPositionRef = useRef(new THREE.Vector3())
  const [isHovered, setIsHovered] = useState(false)

  useCursor(isHovered)

  const textureMap = useMemo(
    () => createPlaceholderTexture(primaryColor, secondaryColor),
    [primaryColor, secondaryColor],
  )

  useEffect(() => {
    return () => {
      if (textureMap) {
        textureMap.dispose()
      }
    }
  }, [textureMap])

  const isActive = isHovered || isSelected

  const handleSelect = (event) => {
    event.stopPropagation()

    if (!planetRef.current || !onSelect) {
      return
    }

    planetRef.current.getWorldPosition(worldPositionRef.current)
    onSelect({
      id,
      size,
      position: worldPositionRef.current.toArray(),
    })
  }

  const handlePointerOver = (event) => {
    event.stopPropagation()
    setIsHovered(true)
  }

  const handlePointerOut = (event) => {
    event.stopPropagation()
    setIsHovered(false)
  }

  useFrame((_, delta) => {
    if (planetRef.current) {
      planetRef.current.rotation.y += axialSpeed * delta
    }

    if (visualRef.current) {
      const targetScale = isActive ? 1.1 : 1
      const nextScale = THREE.MathUtils.damp(
        visualRef.current.scale.x,
        targetScale,
        8,
        delta,
      )
      visualRef.current.scale.setScalar(nextScale)
    }
  })

  return (
    <group rotation={[0, 0, tilt]}>
      <group ref={visualRef}>
        <mesh
          ref={planetRef}
          castShadow
          receiveShadow
          onClick={handleSelect}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[size, 48, 48]} />
          <meshStandardMaterial
            map={textureMap || undefined}
            roughness={0.85}
            metalness={0.05}
            emissive="#5679b8"
            emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.18 : 0}
          />
        </mesh>

        {ring ? (
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            onClick={handleSelect}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <ringGeometry args={[size * ring.innerRadius, size * ring.outerRadius, 128]} />
            <meshStandardMaterial
              color={ring.color}
              transparent
              opacity={isSelected ? 0.9 : isHovered ? 0.85 : 0.75}
              side={THREE.DoubleSide}
              roughness={0.9}
              metalness={0.05}
              emissive="#8fa2c9"
              emissiveIntensity={isSelected ? 0.25 : isHovered ? 0.12 : 0}
            />
          </mesh>
        ) : null}
      </group>
    </group>
  )
}

export default Planet
