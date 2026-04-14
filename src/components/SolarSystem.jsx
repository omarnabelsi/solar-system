import { memo, useCallback, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import Planet from './Planet'
import { PLANET_CONFIG, SPACECRAFT_CONFIG } from '../3d/sceneData'
import { dampScalar, orbitObjectY, spinObjectY } from '../systems/animationSystem'
import {
  dispatchSelection,
  handlePointerOut,
  handlePointerOver,
} from '../systems/interactionSystem'

function SunCore() {
  const sunRef = useRef(null)

  useFrame((state, delta) => {
    if (!sunRef.current) {
      return
    }

    spinObjectY(sunRef.current, 0.18, delta)
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.55) * 0.03
    sunRef.current.scale.setScalar(pulse)
  })

  return (
    <group>
      <mesh ref={sunRef}>
        <sphereGeometry args={[8.5, 96, 96]} />
        <meshStandardMaterial
          color="#ffc274"
          emissive="#ff8a24"
          emissiveIntensity={2.8}
          toneMapped={false}
          roughness={0.4}
        />
      </mesh>

      <mesh scale={1.35}>
        <sphereGeometry args={[8.5, 64, 64]} />
        <meshBasicMaterial color="#ff9d47" transparent opacity={0.16} toneMapped={false} />
      </mesh>

      <pointLight position={[0, 0, 0]} intensity={2800} color="#ffd8a7" distance={0} decay={2} />
    </group>
  )
}

function OrbitLayer({ speed, initialAngle = 0, children }) {
  const orbitRef = useRef(null)

  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitObjectY(orbitRef.current, speed, delta)
    }
  })

  return (
    <group ref={orbitRef} rotation={[0, initialAngle, 0]}>
      {children}
    </group>
  )
}

function Spacecraft({ id, isSelected, onSelectObject, trackRef }) {
  const { camera } = useThree()
  const craftRef = useRef(null)
  const shellRef = useRef(null)
  const worldPosRef = useRef(new THREE.Vector3())
  const [isHovered, setIsHovered] = useState(false)

  useCursor(isHovered)

  useFrame((_, delta) => {
    if (!craftRef.current || !shellRef.current) {
      return
    }

    spinObjectY(craftRef.current, 0.8, delta)
    craftRef.current.getWorldPosition(worldPosRef.current)

    const distance = camera.position.distanceTo(worldPosRef.current)
    const distanceScale = THREE.MathUtils.clamp(1 + (distance - 90) / 800, 1, 1.28)
    const interactiveScale = isSelected || isHovered ? 1.1 : 1
    const nextScale = dampScalar(shellRef.current.scale.x, distanceScale * interactiveScale, 8, delta)
    shellRef.current.scale.setScalar(nextScale)
  })

  return (
    <group ref={trackRef}>
      <group ref={shellRef}>
        <group
          ref={craftRef}
          onClick={(event) =>
            dispatchSelection({
              event,
              id,
              radius: 2,
              objectRef: craftRef,
              onSelect: onSelectObject,
            })
          }
          onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
          onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
        >
          <mesh>
            <cylinderGeometry args={[0.15, 0.28, 1.8, 10]} />
            <meshStandardMaterial
              color="#d6dde8"
              metalness={0.72}
              roughness={0.3}
              emissive="#8fc0ff"
              emissiveIntensity={isSelected ? 0.62 : 0.2}
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

function SolarSystem({ selectedObjectId, onSelectObject, trackedObjectsRef }) {
  const trackedCallbackCacheRef = useRef({})

  const registerTrackedObject = useCallback(
    (id, radius) => (node) => {
      if (!trackedObjectsRef.current) {
        trackedObjectsRef.current = {}
      }

      if (node) {
        trackedObjectsRef.current[id] = { node, radius }
      } else {
        delete trackedObjectsRef.current[id]
      }
    },
    [trackedObjectsRef],
  )

  const getTrackedRef = useCallback(
    (id, radius) => {
      if (!trackedCallbackCacheRef.current[id]) {
        trackedCallbackCacheRef.current[id] = registerTrackedObject(id, radius)
      }

      return trackedCallbackCacheRef.current[id]
    },
    [registerTrackedObject],
  )

  return (
    <group>
      <SunCore />

      {PLANET_CONFIG.map((planetConfig, index) => (
        <OrbitLayer
          key={planetConfig.id}
          speed={planetConfig.orbitSpeed}
          initialAngle={(index / PLANET_CONFIG.length) * Math.PI * 2}
        >
          <group position={[planetConfig.orbitRadius, 0, 0]}>
            <Planet
              planet={planetConfig}
              isSelected={selectedObjectId === planetConfig.id}
              onSelectPlanet={onSelectObject}
              trackRef={getTrackedRef(planetConfig.id, planetConfig.radius)}
            />

            {planetConfig.moons?.map((moonConfig, moonIndex) => (
              <OrbitLayer
                key={moonConfig.id}
                speed={moonConfig.orbitSpeed}
                initialAngle={(moonIndex / 3) * Math.PI * 2}
              >
                <group position={[moonConfig.orbitRadius, 0, 0]}>
                  <Planet
                    planet={moonConfig}
                    isSelected={selectedObjectId === moonConfig.id}
                    onSelectPlanet={onSelectObject}
                    trackRef={getTrackedRef(moonConfig.id, moonConfig.radius)}
                  />
                </group>
              </OrbitLayer>
            ))}
          </group>
        </OrbitLayer>
      ))}

      <OrbitLayer speed={SPACECRAFT_CONFIG.orbitSpeed} initialAngle={Math.PI * 0.35}>
        <group position={[SPACECRAFT_CONFIG.orbitRadius, 7, 0]} rotation={[0.25, Math.PI * 0.3, 0]}>
          <Spacecraft
            id={SPACECRAFT_CONFIG.id}
            isSelected={selectedObjectId === SPACECRAFT_CONFIG.id}
            onSelectObject={onSelectObject}
            trackRef={getTrackedRef(SPACECRAFT_CONFIG.id, 2)}
          />
        </group>
      </OrbitLayer>

      <gridHelper
        args={[280, 72, new THREE.Color('#1f2538'), new THREE.Color('#0f1322')]}
        position={[0, -30, 0]}
      />
    </group>
  )
}

export default memo(SolarSystem)
