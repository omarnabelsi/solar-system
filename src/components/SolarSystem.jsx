import { memo, useCallback, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import Planet from './Planet'
import Earth from './Earth'
import Sun from './Sun'
import { PLANET_CONFIG, SPACECRAFT_CONFIG } from '../3d/sceneData'
import { dampScalar, orbitObjectY, spinObjectY } from '../systems/animationSystem'
import {
  dispatchSelection,
  handlePointerOut,
  handlePointerOver,
} from '../systems/interactionSystem'

function OrbitLayer({ speed, initialAngle = 0, isPaused = false, children }) {
  const orbitRef = useRef(null)

  useFrame((_, delta) => {
    if (!isPaused && orbitRef.current) {
      orbitObjectY(orbitRef.current, speed, delta)
    }
  })

  return (
    <group ref={orbitRef} rotation={[0, initialAngle, 0]}>
      {children}
    </group>
  )
}

function Spacecraft({ id, isSelected, onSelectObject, trackRef, isPaused = false, selectionLocked = false }) {
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

    if (!isPaused) {
      spinObjectY(craftRef.current, 0.8, delta)
    }
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
          onClick={(event) => {
            if (selectionLocked) {
              event.stopPropagation()
              return
            }

            dispatchSelection({
              event,
              id,
              radius: 2,
              objectRef: craftRef,
              onSelect: onSelectObject,
            })
          }}
          onPointerOver={(event) => handlePointerOver(event, setIsHovered)}
          onPointerOut={(event) => handlePointerOut(event, setIsHovered)}
        >
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.15, 0.28, 1.8, 10]} />
            <meshStandardMaterial
              color="#d6dde8"
              metalness={0.72}
              roughness={0.3}
              emissive="#8fc0ff"
              emissiveIntensity={isSelected ? 0.62 : 0.2}
            />
          </mesh>

          <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.24, 0.55, 10]} />
            <meshStandardMaterial color="#f0f4fb" metalness={0.85} roughness={0.26} />
          </mesh>

          <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <torusGeometry args={[0.38, 0.04, 12, 24]} />
            <meshStandardMaterial color="#7ea6dc" emissive="#5b8fd5" emissiveIntensity={0.45} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function SolarSystem({
  selectedObjectId,
  onSelectObject,
  trackedObjectsRef,
  cameraMode,
  isPaused = false,
  selectionLocked = false,
}) {
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
      <Sun trackRef={getTrackedRef('Sun', 8.5)} isPaused={isPaused} />

      {PLANET_CONFIG.map((planetConfig, index) => (
        <OrbitLayer
          key={planetConfig.id}
          speed={planetConfig.orbitSpeed}
          initialAngle={(index / PLANET_CONFIG.length) * Math.PI * 2}
          isPaused={isPaused}
        >
          <group position={[planetConfig.orbitRadius, 0, 0]}>
            {planetConfig.id === 'Earth' ? (
              <Earth
                planet={planetConfig}
                isSelected={selectedObjectId === planetConfig.id}
                isFocused={cameraMode === 'planetFocus' && selectedObjectId === planetConfig.id}
                onSelectPlanet={onSelectObject}
                trackRef={getTrackedRef(planetConfig.id, planetConfig.radius)}
                isPaused={isPaused}
                selectionLocked={selectionLocked}
              />
            ) : (
              <Planet
                planet={planetConfig}
                isSelected={selectedObjectId === planetConfig.id}
                isFocused={cameraMode === 'planetFocus' && selectedObjectId === planetConfig.id}
                onSelectPlanet={onSelectObject}
                trackRef={getTrackedRef(planetConfig.id, planetConfig.radius)}
                isPaused={isPaused}
                selectionLocked={selectionLocked}
              />
            )}

            {planetConfig.moons?.map((moonConfig, moonIndex) => (
              <OrbitLayer
                key={moonConfig.id}
                speed={moonConfig.orbitSpeed}
                initialAngle={(moonIndex / 3) * Math.PI * 2}
                isPaused={isPaused}
              >
                <group position={[moonConfig.orbitRadius, 0, 0]}>
                  <Planet
                    planet={moonConfig}
                    isSelected={selectedObjectId === moonConfig.id}
                    isFocused={cameraMode === 'planetFocus' && selectedObjectId === moonConfig.id}
                    onSelectPlanet={onSelectObject}
                    trackRef={getTrackedRef(moonConfig.id, moonConfig.radius)}
                    isPaused={isPaused}
                    selectionLocked={selectionLocked}
                  />
                </group>
              </OrbitLayer>
            ))}
          </group>
        </OrbitLayer>
      ))}

      <OrbitLayer speed={SPACECRAFT_CONFIG.orbitSpeed} initialAngle={Math.PI * 0.35} isPaused={isPaused}>
        <group position={[SPACECRAFT_CONFIG.orbitRadius, 7, 0]} rotation={[0.25, Math.PI * 0.3, 0]}>
          <Spacecraft
            id={SPACECRAFT_CONFIG.id}
            isSelected={selectedObjectId === SPACECRAFT_CONFIG.id}
            onSelectObject={onSelectObject}
            trackRef={getTrackedRef(SPACECRAFT_CONFIG.id, 2)}
            isPaused={isPaused}
            selectionLocked={selectionLocked}
          />
        </group>
      </OrbitLayer>
    </group>
  )
}

export default memo(SolarSystem)
