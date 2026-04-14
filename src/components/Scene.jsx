import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import CameraController from './CameraController'
import SolarSystem from './SolarSystem'

const CAMERA_CONFIG = {
  position: [0, 120, 280],
  fov: 42,
  near: 0.1,
  far: 4000,
}

const HOME_VIEW = {
  position: [0, 120, 280],
  target: [0, 0, 0],
}

function Scene({ selectedPlanet, onSelectPlanet }) {
  const controlsRef = useRef(null)
  const [isTraveling, setIsTraveling] = useState(false)

  return (
    <Canvas
      camera={CAMERA_CONFIG}
      dpr={[1, 1.5]}
      onPointerMissed={() => onSelectPlanet(null)}
    >
      <color attach="background" args={['#02030b']} />

      <Stars
        radius={1500}
        depth={700}
        count={8000}
        factor={6}
        saturation={0}
        fade
        speed={0.3}
      />

      <ambientLight intensity={0.22} />
      <SolarSystem
        selectedPlanetId={selectedPlanet?.id || null}
        onSelectPlanet={onSelectPlanet}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 0]}
        enabled={!isTraveling}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.8}
        panSpeed={0.6}
        minDistance={100}
        maxDistance={950}
        maxPolarAngle={Math.PI * 0.92}
      />

      <CameraController
        selectedPlanet={selectedPlanet}
        controlsRef={controlsRef}
        onTravelStateChange={setIsTraveling}
        homeView={HOME_VIEW}
      />
    </Canvas>
  )
}

export default Scene
