import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { dampScalar, spinObjectY } from '../systems/animationSystem'
import { useSafeTextureMap } from '../hooks/useSafeTexture'
import {
  clearGlobalCursor,
  dispatchSelection,
  handlePointerOut,
  handlePointerOver,
} from '../systems/interactionSystem'

const COLOR_TEXTURE_KEYS = new Set(['map', 'emissiveMap', 'cloudMap', 'ringMap'])

function configureTexture(texture, gl, isColorTexture) {
  if (!texture) {
    return
  }

  texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  if (isColorTexture) {
    texture.colorSpace = THREE.SRGBColorSpace
  }

  texture.needsUpdate = true
}

function createRingGeometry(innerRadius, outerRadius, segments = 320) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments)
  const positionAttribute = geometry.attributes.position
  const uvAttribute = geometry.attributes.uv
  const vertex = new THREE.Vector3()

  for (let i = 0; i < positionAttribute.count; i += 1) {
    vertex.fromBufferAttribute(positionAttribute, i)
    const radius = vertex.length()
    const u = (radius - innerRadius) / (outerRadius - innerRadius)
    uvAttribute.setXY(i, u, 1)
  }

  uvAttribute.needsUpdate = true
  return geometry
}

function Planet({
  planet,
  isSelected,
  isFocused = false,
  onSelectPlanet,
  trackRef,
  isPaused = false,
  selectionLocked = false,
}) {
  const { camera, gl } = useThree()
  const baseRef = useRef(null)
  const cloudRef = useRef(null)
  const visualRef = useRef(null)
  const worldPosRef = useRef(new THREE.Vector3())
  const [isHovered, setIsHovered] = useState(false)

  useCursor(isHovered)

  const texturePaths = useMemo(
    () => ({
      map: planet.textures?.map,
      normalMap: planet.textures?.normalMap,
      bumpMap: planet.textures?.bumpMap,
      roughnessMap: planet.textures?.roughnessMap,
      emissiveMap: planet.textures?.emissiveMap,
      cloudMap: planet.cloudLayer?.map,
      ringMap: planet.ring?.map,
      ringAlphaMap: planet.ring?.alphaMap,
    }),
    [planet],
  )

  const activeTextureEntries = useMemo(
    () => Object.entries(texturePaths).filter(([, path]) => Boolean(path)),
    [texturePaths],
  )
  const textures = useSafeTextureMap(activeTextureEntries)

  const ringGeometry = useMemo(() => {
    if (!planet.ring) {
      return null
    }

    const innerRadius = planet.radius * planet.ring.innerMultiplier
    const outerRadius = planet.radius * planet.ring.outerMultiplier
    return createRingGeometry(innerRadius, outerRadius)
  }, [planet])

  const normalScale = useMemo(() => {
    const amount = planet.textures?.normalScale || 1
    return new THREE.Vector2(amount, amount)
  }, [planet.textures?.normalScale])

  useEffect(() => {
    Object.entries(textures).forEach(([key, texture]) => {
      configureTexture(texture, gl, COLOR_TEXTURE_KEYS.has(key))
    })
  }, [textures, gl])

  useEffect(() => {
    return () => {
      clearGlobalCursor()
      if (ringGeometry) {
        ringGeometry.dispose()
      }
    }
  }, [ringGeometry])

  useFrame((_, delta) => {
    const focusSpinMultiplier = isPaused && isFocused ? 0.35 : 1
    const shouldSpin = !isPaused || isFocused

    if (baseRef.current) {
      if (shouldSpin) {
        spinObjectY(baseRef.current, planet.rotationSpeed * focusSpinMultiplier, delta)
      }
      baseRef.current.getWorldPosition(worldPosRef.current)
    }

    if (cloudRef.current && planet.cloudLayer) {
      if (shouldSpin) {
        spinObjectY(
          cloudRef.current,
          planet.rotationSpeed * (planet.cloudLayer.speedMultiplier || 1.08) * focusSpinMultiplier,
          delta,
        )
      }
    }

    if (visualRef.current) {
      const distance = camera.position.distanceTo(worldPosRef.current)
      const distanceScale = THREE.MathUtils.clamp(1 + (distance - 70) / 700, 1, 1.35)
      const activeScale = isFocused ? 1.18 : isSelected || isHovered ? 1.08 : 1
      const targetScale = distanceScale * activeScale
      const nextScale = dampScalar(visualRef.current.scale.x, targetScale, 8, delta)
      visualRef.current.scale.setScalar(nextScale)
    }
  })

  const hasEmissiveData = Boolean(textures.emissiveMap || planet.textures?.emissiveColor)
  const baseEmissiveIntensity = hasEmissiveData ? (planet.textures?.emissiveIntensity || 0.14) : 0
  const emissiveIntensity = hasEmissiveData
    ? isFocused
      ? baseEmissiveIntensity + 0.09
      : isSelected
      ? baseEmissiveIntensity + 0.06
      : isHovered
        ? baseEmissiveIntensity + 0.03
        : baseEmissiveIntensity
    : 0
  const emissiveColor = hasEmissiveData ? (planet.textures?.emissiveColor || '#182238') : '#000000'
  const envMapIntensity = planet.isGasGiant ? 0.18 : 0.1
  const ringTilt = planet.ring?.tilt || 0

  return (
    <group ref={trackRef} rotation={[0, 0, planet.axialTilt || 0]}>
      <group ref={visualRef}>
        <mesh
          ref={baseRef}
          raycast={THREE.Mesh.prototype.raycast}
          onClick={(event) => {
            if (selectionLocked) {
              event.stopPropagation()
              return
            }

            dispatchSelection({
              event,
              id: planet.id,
              radius: planet.radius,
              objectRef: baseRef,
              onSelect: onSelectPlanet,
            })
          }}
          onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
          onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[planet.radius, 96, 96]} />
          <meshStandardMaterial
            map={textures.map || undefined}
            normalMap={textures.normalMap || undefined}
            normalScale={textures.normalMap ? normalScale : undefined}
            bumpMap={textures.bumpMap || undefined}
            bumpScale={planet.textures?.bumpScale || 0}
            roughnessMap={textures.roughnessMap || undefined}
            roughness={planet.textures?.roughness ?? 0.9}
            metalness={planet.textures?.metalness ?? 0.03}
            flatShading={false}
            envMapIntensity={envMapIntensity}
            emissive={emissiveColor}
            emissiveMap={hasEmissiveData ? textures.emissiveMap || undefined : undefined}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {planet.cloudLayer && textures.cloudMap ? (
          <mesh
            ref={cloudRef}
            raycast={THREE.Mesh.prototype.raycast}
            onClick={(event) => {
              if (selectionLocked) {
                event.stopPropagation()
                return
              }

              dispatchSelection({
                event,
                id: planet.id,
                radius: planet.radius,
                objectRef: baseRef,
                onSelect: onSelectPlanet,
              })
            }}
            onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
            onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
          >
            <sphereGeometry args={[planet.radius * 1.016, 72, 72]} />
            <meshStandardMaterial
              map={textures.cloudMap}
              transparent
              opacity={planet.cloudLayer.opacity || 0.3}
              depthWrite={false}
              roughness={1}
              metalness={0}
            />
          </mesh>
        ) : null}

        {planet.ring && ringGeometry ? (
          <mesh
            geometry={ringGeometry}
            raycast={THREE.Mesh.prototype.raycast}
            rotation={[Math.PI / 2 + ringTilt, 0, 0]}
            onClick={(event) => {
              if (selectionLocked) {
                event.stopPropagation()
                return
              }

              dispatchSelection({
                event,
                id: planet.id,
                radius: planet.radius,
                objectRef: baseRef,
                onSelect: onSelectPlanet,
              })
            }}
            onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
            onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              map={textures.ringMap || undefined}
              alphaMap={textures.ringAlphaMap || undefined}
              color={planet.ring.color || '#f2d3a2'}
              transparent
              alphaTest={0.08}
              opacity={isFocused || isSelected ? 0.98 : planet.ring.opacity || 0.9}
              side={THREE.DoubleSide}
              roughness={0.82}
              metalness={0.02}
              emissive={planet.ring.color || '#f2d3a2'}
              emissiveIntensity={isFocused || isSelected ? 0.09 : 0.03}
              depthWrite={false}
            />
          </mesh>
        ) : null}

        {planet.atmosphere ? (
          <mesh scale={planet.atmosphere.scale || 1.03}>
            <sphereGeometry args={[planet.radius, 72, 72]} />
            <meshStandardMaterial
              color={planet.atmosphere.color || '#7cc6ff'}
              transparent
              opacity={planet.atmosphere.opacity || 0.12}
              emissive={planet.atmosphere.color || '#7cc6ff'}
              emissiveIntensity={0.15}
              blending={THREE.AdditiveBlending}
              side={THREE.BackSide}
              depthWrite={false}
            />
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
    && prevProps.isFocused === nextProps.isFocused
    && prevProps.onSelectPlanet === nextProps.onSelectPlanet
    && prevProps.trackRef === nextProps.trackRef
    && prevProps.isPaused === nextProps.isPaused
    && prevProps.selectionLocked === nextProps.selectionLocked
  )
}

export default memo(Planet, areEqual)
