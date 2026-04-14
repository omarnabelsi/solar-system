import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { dampScalar, spinObjectY } from '../systems/animationSystem'
import {
  clearGlobalCursor,
  dispatchSelection,
  handlePointerOut,
  handlePointerOver,
} from '../systems/interactionSystem'

function hashString(inputValue) {
  let hash = 2166136261

  for (let i = 0; i < inputValue.length; i += 1) {
    hash ^= inputValue.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return Math.abs(hash >>> 0)
}

function seededRandom(seed, index) {
  const raw = Math.sin(seed * 0.013 + index * 12.9898) * 43758.5453
  return raw - Math.floor(raw)
}

function rgbaFromHex(hexColor, alpha) {
  const color = new THREE.Color(hexColor)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')'
}

function finalizeTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(2, 1)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function createSurfaceTexture(surfaceColors, seed) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  const [primary, secondary] = surfaceColors
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, primary)
  gradient.addColorStop(1, secondary)
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const stripeColor = rgbaFromHex(secondary, 0.42)
  for (let i = 0; i < 30; i += 1) {
    const y = (i / 30) * canvas.height
    const wave = Math.sin(i * 0.7 + seed * 0.00002) * 12
    context.fillStyle = stripeColor
    context.fillRect(0, y + wave, canvas.width, 7)
  }

  for (let i = 0; i < 1400; i += 1) {
    const x = seededRandom(seed + 4, i) * canvas.width
    const y = seededRandom(seed + 9, i) * canvas.height
    const radius = 0.4 + seededRandom(seed + 17, i) * 2.6
    const tone = seededRandom(seed, i) > 0.5 ? primary : secondary

    context.fillStyle = rgbaFromHex(tone, 0.06 + seededRandom(seed + 23, i) * 0.22)
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  return finalizeTexture(new THREE.CanvasTexture(canvas))
}

function createCloudTexture(cloudColors, seed) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  context.clearRect(0, 0, canvas.width, canvas.height)

  const [primaryCloud, secondaryCloud] = cloudColors

  for (let i = 0; i < 360; i += 1) {
    const x = seededRandom(seed + 33, i) * canvas.width
    const y = seededRandom(seed + 47, i) * canvas.height
    const width = 8 + seededRandom(seed + 58, i) * 52
    const height = 3 + seededRandom(seed + 73, i) * 16
    const alpha = 0.06 + seededRandom(seed + 89, i) * 0.2

    const cloudGradient = context.createLinearGradient(x, y, x + width, y + height)
    cloudGradient.addColorStop(0, rgbaFromHex(primaryCloud, alpha))
    cloudGradient.addColorStop(1, rgbaFromHex(secondaryCloud, alpha * 0.7))

    context.fillStyle = cloudGradient
    context.beginPath()
    context.ellipse(x, y, width, height, seededRandom(seed + 99, i) * Math.PI, 0, Math.PI * 2)
    context.fill()
  }

  const texture = finalizeTexture(new THREE.CanvasTexture(canvas))
  texture.repeat.set(2.2, 1)
  return texture
}

function createAtmosphereMaterial(colorHex) {
  // Fresnel-based glow keeps atmosphere bright on the limb and subtle in front view.
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(colorHex || '#7cc6ff') },
      intensity: { value: 0.58 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.4);
        float alpha = fresnel * intensity;
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  })
}

function Planet({ planet, isSelected, onSelectPlanet, trackRef }) {
  const { camera } = useThree()
  const baseRef = useRef(null)
  const cloudRef = useRef(null)
  const visualRef = useRef(null)
  const worldPosRef = useRef(new THREE.Vector3())
  const [isHovered, setIsHovered] = useState(false)

  useCursor(isHovered)

  const seed = useMemo(() => hashString(planet.id || 'planet'), [planet.id])

  const surfaceTexture = useMemo(
    () => createSurfaceTexture(planet.surfaceColors || ['#8ea1be', '#304363'], seed),
    [planet.surfaceColors, seed],
  )

  const cloudTexture = useMemo(
    () =>
      planet.cloudLayer
        ? createCloudTexture(planet.cloudLayer.colors || ['#ffffff', '#a6c3e8'], seed + 121)
        : null,
    [planet.cloudLayer, seed],
  )

  const atmosphereMaterial = useMemo(
    () =>
      planet.atmosphereColor
        ? createAtmosphereMaterial(planet.atmosphereColor)
        : null,
    [planet.atmosphereColor],
  )

  useEffect(() => {
    return () => {
      if (surfaceTexture) {
        surfaceTexture.dispose()
      }
      if (cloudTexture) {
        cloudTexture.dispose()
      }
      if (atmosphereMaterial) {
        atmosphereMaterial.dispose()
      }
      clearGlobalCursor()
    }
  }, [surfaceTexture, cloudTexture, atmosphereMaterial])

  useFrame((_, delta) => {
    if (baseRef.current) {
      spinObjectY(baseRef.current, planet.rotationSpeed, delta)
      baseRef.current.getWorldPosition(worldPosRef.current)
    }

    if (cloudRef.current && planet.cloudLayer) {
      spinObjectY(
        cloudRef.current,
        planet.rotationSpeed * (planet.cloudLayer.speedMultiplier || 1.08),
        delta,
      )
    }

    if (visualRef.current) {
      const distance = camera.position.distanceTo(worldPosRef.current)
      const distanceScale = THREE.MathUtils.clamp(1 + (distance - 70) / 700, 1, 1.35)
      const activeScale = isSelected || isHovered ? 1.08 : 1
      const targetScale = distanceScale * activeScale
      const nextScale = dampScalar(visualRef.current.scale.x, targetScale, 8, delta)
      visualRef.current.scale.setScalar(nextScale)
    }
  })

  return (
    <group ref={trackRef} rotation={[0, 0, planet.axialTilt || 0]}>
      <group ref={visualRef}>
        <mesh
          ref={baseRef}
          raycast={THREE.Mesh.prototype.raycast}
          onClick={(event) =>
            dispatchSelection({
              event,
              id: planet.id,
              radius: planet.radius,
              objectRef: baseRef,
              onSelect: onSelectPlanet,
            })
          }
          onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
          onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[planet.radius, 72, 72]} />
          <meshStandardMaterial
            map={surfaceTexture || undefined}
            roughness={0.82}
            metalness={0.06}
            emissive={planet.glowColor || '#000000'}
            emissiveIntensity={isSelected ? 0.2 : isHovered ? 0.11 : 0.06}
          />
        </mesh>

        {planet.cloudLayer ? (
          <mesh
            ref={cloudRef}
            raycast={THREE.Mesh.prototype.raycast}
            onClick={(event) =>
              dispatchSelection({
                event,
                id: planet.id,
                radius: planet.radius,
                objectRef: baseRef,
                onSelect: onSelectPlanet,
              })
            }
            onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
            onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
          >
            <sphereGeometry args={[planet.radius * 1.02, 64, 64]} />
            <meshStandardMaterial
              map={cloudTexture || undefined}
              transparent
              opacity={planet.cloudLayer.opacity || 0.35}
              depthWrite={false}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
        ) : null}

        {planet.ring ? (
          <mesh
            raycast={THREE.Mesh.prototype.raycast}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(event) =>
              dispatchSelection({
                event,
                id: planet.id,
                radius: planet.radius,
                objectRef: baseRef,
                onSelect: onSelectPlanet,
              })
            }
            onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
            onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
          >
            <ringGeometry
              args={[
                planet.radius * planet.ring.innerMultiplier,
                planet.radius * planet.ring.outerMultiplier,
                256,
              ]}
            />
            <meshStandardMaterial
              color={planet.ring.color || '#e8d5b8'}
              transparent
              opacity={isSelected ? 0.92 : planet.ring.opacity || 0.78}
              side={THREE.DoubleSide}
              roughness={0.88}
              metalness={0.04}
              emissive={planet.ring.color || '#e8d5b8'}
              emissiveIntensity={isSelected ? 0.16 : 0.06}
            />
          </mesh>
        ) : null}

        {atmosphereMaterial ? (
          <mesh scale={1.1}>
            <sphereGeometry args={[planet.radius, 64, 64]} />
            <primitive attach="material" object={atmosphereMaterial} />
          </mesh>
        ) : null}
      </group>
    </group>
  )
}

function areEqual(prevProps, nextProps) {
  return (
    prevProps.planet === nextProps.planet
    && prevProps.isSelected === nextProps.isSelected
    && prevProps.onSelectPlanet === nextProps.onSelectPlanet
    && prevProps.trackRef === nextProps.trackRef
  )
}

export default memo(Planet, areEqual)
