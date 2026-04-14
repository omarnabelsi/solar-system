import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Planet from './Planet'

const PLANET_CONFIG = [
  {
    name: 'Mercury',
    size: 1.2,
    distance: 14,
    orbitSpeed: 0.95,
    axialSpeed: 1.2,
    colors: ['#9f8e77', '#5f5243'],
    tilt: 0.02,
  },
  {
    name: 'Venus',
    size: 1.9,
    distance: 21,
    orbitSpeed: 0.75,
    axialSpeed: 0.7,
    colors: ['#d8b48a', '#8e6a48'],
    tilt: 0.07,
  },
  {
    name: 'Earth',
    size: 2,
    distance: 30,
    orbitSpeed: 0.62,
    axialSpeed: 1.8,
    colors: ['#3c82d6', '#1d3d73'],
    tilt: 0.41,
  },
  {
    name: 'Mars',
    size: 1.6,
    distance: 39,
    orbitSpeed: 0.5,
    axialSpeed: 1.6,
    colors: ['#c66c41', '#74371f'],
    tilt: 0.44,
  },
  {
    name: 'Jupiter',
    size: 4.5,
    distance: 54,
    orbitSpeed: 0.28,
    axialSpeed: 2.4,
    colors: ['#d1b191', '#7b5f43'],
    tilt: 0.05,
  },
  {
    name: 'Saturn',
    size: 4,
    distance: 70,
    orbitSpeed: 0.22,
    axialSpeed: 2,
    colors: ['#d6c39e', '#8e744e'],
    tilt: 0.47,
    ring: {
      innerRadius: 1.35,
      outerRadius: 2.25,
      color: '#dbcaa7',
    },
  },
  {
    name: 'Uranus',
    size: 3.2,
    distance: 84,
    orbitSpeed: 0.16,
    axialSpeed: 1.9,
    colors: ['#8fd8df', '#4a7d86'],
    tilt: 1.7,
  },
  {
    name: 'Neptune',
    size: 3.1,
    distance: 97,
    orbitSpeed: 0.12,
    axialSpeed: 1.85,
    colors: ['#4668d7', '#1f2f6a'],
    tilt: 0.49,
  },
]

function Sun() {
  const sunRef = useRef(null)

  useFrame((state, delta) => {
    if (!sunRef.current) {
      return
    }

    sunRef.current.rotation.y += 0.15 * delta
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.03
    sunRef.current.scale.setScalar(pulse)
  })

  return (
    <group>
      <mesh ref={sunRef}>
        <sphereGeometry args={[8, 64, 64]} />
        <meshStandardMaterial
          color="#f8ba67"
          emissive="#ff8f34"
          emissiveIntensity={2.3}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        position={[0, 0, 0]}
        intensity={2400}
        color="#ffd38f"
        distance={0}
        decay={2}
      />
    </group>
  )
}

function OrbitingPlanet({ distance, orbitSpeed, startAngle, children }) {
  const orbitRef = useRef(null)

  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += orbitSpeed * delta
    }
  })

  return (
    <group ref={orbitRef} rotation={[0, startAngle, 0]}>
      <group position={[distance, 0, 0]}>{children}</group>
    </group>
  )
}

function SolarSystem({ selectedPlanetId = null, onSelectPlanet }) {
  return (
    <group>
      <Sun />

      {PLANET_CONFIG.map((planet, index) => (
        <OrbitingPlanet
          key={planet.name}
          distance={planet.distance}
          orbitSpeed={planet.orbitSpeed}
          startAngle={(index / PLANET_CONFIG.length) * Math.PI * 2}
        >
          <Planet
            id={planet.name}
            size={planet.size}
            primaryColor={planet.colors[0]}
            secondaryColor={planet.colors[1]}
            axialSpeed={planet.axialSpeed}
            tilt={planet.tilt}
            ring={planet.ring}
            isSelected={selectedPlanetId === planet.name}
            onSelect={onSelectPlanet}
          />
        </OrbitingPlanet>
      ))}
    </group>
  )
}

export default SolarSystem
