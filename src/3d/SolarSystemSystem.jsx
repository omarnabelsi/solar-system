import { useCallback, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import PlanetBody from './PlanetBody'
import Spacecraft from './Spacecraft'
import { PLANET_CONFIG, SPACECRAFT_CONFIG } from './sceneData'

function SunCore() {
  const sunRef = useRef(null)

  useFrame((state, delta) => {
    if (!sunRef.current) {
      return
    }

    sunRef.current.rotation.y += 0.18 * delta
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
      orbitRef.current.rotation.y += speed * delta
    }
  })

  return (
    <group ref={orbitRef} rotation={[0, initialAngle, 0]}>
      {children}
    </group>
  )
}

function SolarSystemSystem({ selectedObjectId, onSelectObject, trackedObjectRefs }) {
  const registerTrackedObject = useCallback(
    (id, radius) => (node) => {
      if (!trackedObjectRefs.current) {
        trackedObjectRefs.current = {}
      }

      if (node) {
        trackedObjectRefs.current[id] = { node, radius }
      } else {
        delete trackedObjectRefs.current[id]
      }
    },
    [trackedObjectRefs],
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
            <PlanetBody
              id={planetConfig.id}
              radius={planetConfig.radius}
              surfaceColors={planetConfig.surfaceColors}
              cloudLayer={planetConfig.cloudLayer}
              ring={planetConfig.ring}
              rotationSpeed={planetConfig.rotationSpeed}
              axialTilt={planetConfig.axialTilt}
              glowColor={planetConfig.glowColor}
              atmosphereColor={planetConfig.atmosphereColor}
              isSelected={selectedObjectId === planetConfig.id}
              onSelect={onSelectObject}
              anchorRef={registerTrackedObject(planetConfig.id, planetConfig.radius)}
            />

            {planetConfig.moons?.map((moonConfig, moonIndex) => (
              <OrbitLayer
                key={moonConfig.id}
                speed={moonConfig.orbitSpeed}
                initialAngle={(moonIndex / 3) * Math.PI * 2}
              >
                <group position={[moonConfig.orbitRadius, 0, 0]}>
                  <PlanetBody
                    id={moonConfig.id}
                    radius={moonConfig.radius}
                    surfaceColors={moonConfig.surfaceColors}
                    rotationSpeed={moonConfig.rotationSpeed}
                    glowColor={moonConfig.glowColor}
                    isSelected={selectedObjectId === moonConfig.id}
                    onSelect={onSelectObject}
                    anchorRef={registerTrackedObject(moonConfig.id, moonConfig.radius)}
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
            onSelect={onSelectObject}
            anchorRef={registerTrackedObject(SPACECRAFT_CONFIG.id, 2)}
          />
        </group>
      </OrbitLayer>
    </group>
  )
}

export default SolarSystemSystem
