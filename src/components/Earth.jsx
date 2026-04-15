import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { dampScalar, spinObjectY } from '../systems/animationSystem'
import { useSafeTexture } from '../hooks/useSafeTexture'
import {
  clearGlobalCursor,
  dispatchSelection,
  handlePointerOut,
  handlePointerOver,
} from '../systems/interactionSystem'

const EARTH_DAY_PATH = '/textures/earth_day.jpg'
const EARTH_NIGHT_PATH = '/textures/earth_night.jpg'
const EARTH_CLOUDS_PATH = '/textures/earth_clouds.png'

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 glowColor;
  uniform float fresnelPower;
  uniform float intensity;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    // Fresnel boost: brightest on the limb, subtle when viewed head-on.
    float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0), fresnelPower);
    float alpha = fresnel * intensity;
    gl_FragColor = vec4(glowColor, alpha);
  }
`

function configureColorTexture(texture, gl) {
  if (!texture) {
    return
  }

  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
}

function Earth({
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
  const shaderRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)

  const dayMap = useSafeTexture(EARTH_DAY_PATH)
  const nightMap = useSafeTexture(EARTH_NIGHT_PATH)
  const cloudMap = useSafeTexture(EARTH_CLOUDS_PATH)

  useCursor(isHovered)

  const atmosphereUniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color('#6db7ff') },
      fresnelPower: { value: 2.6 },
      intensity: { value: 0.45 },
    }),
    [],
  )

  useEffect(() => {
    configureColorTexture(dayMap, gl)
    configureColorTexture(nightMap, gl)
    configureColorTexture(cloudMap, gl)
  }, [dayMap, nightMap, cloudMap, gl])

  const handleSurfaceCompile = useCallback(
    (shader) => {
      shader.uniforms.nightMap = { value: nightMap }
      shader.uniforms.sunPosition = { value: new THREE.Vector3(0, 0, 0) }
      shaderRef.current = shader

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;`,
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);`,
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D nightMap;
          uniform vec3 sunPosition;
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          // Day/night blending: city lights fade in as the surface turns away from the sun.
          vec3 toSun = normalize(sunPosition - vWorldPosition);
          float sunFacing = max(dot(normalize(vWorldNormal), toSun), 0.0);
          float darkness = smoothstep(0.06, 0.8, 1.0 - sunFacing);
          vec3 cityLights = texture2D(nightMap, vMapUv).rgb;
          totalEmissiveRadiance += cityLights * darkness * 1.55;`,
        )
    },
    [nightMap],
  )

  useFrame((_, delta) => {
    const focusSpinMultiplier = isPaused && isFocused ? 0.35 : 1
    const shouldSpin = !isPaused || isFocused

    if (baseRef.current) {
      // Earth spin is intentionally slower than other bodies for a more natural cadence.
      if (shouldSpin) {
        spinObjectY(baseRef.current, (planet.rotationSpeed || 1) * 0.18 * focusSpinMultiplier, delta)
      }
      baseRef.current.getWorldPosition(worldPosRef.current)
    }

    if (cloudRef.current) {
      // Cloud shell rotates slightly faster than the ground layer to feel alive.
      if (shouldSpin) {
        spinObjectY(cloudRef.current, (planet.rotationSpeed || 1) * 0.22 * focusSpinMultiplier, delta)
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

    if (shaderRef.current) {
      shaderRef.current.uniforms.sunPosition.value.set(0, 0, 0)
    }
  })

  useEffect(() => {
    return () => {
      clearGlobalCursor()
    }
  }, [])

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
            color={planet.surfaceColors?.[0] || '#3e6db8'}
            map={dayMap}
            roughness={0.76}
            metalness={0.03}
            emissive="#1e3a63"
            emissiveIntensity={isFocused ? 0.14 : isSelected ? 0.12 : 0.06}
            onBeforeCompile={nightMap ? handleSurfaceCompile : undefined}
          />
        </mesh>

        {cloudMap ? (
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
            <sphereGeometry args={[planet.radius * 1.01, 80, 80]} />
            <meshStandardMaterial
              map={cloudMap}
              alphaMap={cloudMap}
              transparent
              opacity={planet.cloudLayer?.opacity || 0.35}
              depthWrite={false}
              roughness={0.95}
              metalness={0}
            />
          </mesh>
        ) : null}

        <mesh scale={1.05}>
          <sphereGeometry args={[planet.radius, 96, 96]} />
          <shaderMaterial
            uniforms={atmosphereUniforms}
            vertexShader={ATMOSPHERE_VERTEX_SHADER}
            fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
            transparent
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
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

export default memo(Earth, areEqual)