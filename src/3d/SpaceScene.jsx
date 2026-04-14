import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Environment,
  OrbitControls,
  PointerLockControls,
  Sparkles,
  Stars,
} from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import CameraRig from './CameraRig'
import FlightController from './FlightController'
import NebulaSkybox from './NebulaSkybox'
import SolarSystemSystem from './SolarSystemSystem'
import { HOME_VIEW } from './sceneData'

function SpaceScene({
  selectedObjectId,
  onSelectObject,
  cameraMode,
  warpEnabled,
  onTravelStateChange,
}) {
  const controlsRef = useRef(null)
  const trackedObjectRefs = useRef({})
  const [isTraveling, setIsTraveling] = useState(false)

  const orbitEnabled = cameraMode !== 'ship' && !isTraveling

  return (
    <Canvas
      camera={{
        position: HOME_VIEW.position,
        fov: 42,
        near: 0.1,
        far: 5000,
      }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => {
        if (cameraMode !== 'ship') {
          onSelectObject(null)
        }
      }}
    >
      <color attach="background" args={['#02030d']} />

      <NebulaSkybox />
      <Stars radius={1800} depth={900} count={12000} factor={7} saturation={0} fade speed={0.28} />
      <Sparkles count={120} speed={0.15} size={5} scale={420} color="#9fb7ff" opacity={0.6} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[120, 80, -30]} intensity={0.45} color="#9bb8ff" />
      <Environment preset="night" blur={0.65} background={false} />

      <SolarSystemSystem
        selectedObjectId={selectedObjectId}
        onSelectObject={onSelectObject}
        trackedObjectRefs={trackedObjectRefs}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={orbitEnabled}
        target={HOME_VIEW.target}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.46}
        zoomSpeed={0.8}
        panSpeed={0.6}
        minDistance={18}
        maxDistance={1150}
        maxPolarAngle={Math.PI * 0.95}
      />

      <PointerLockControls enabled={cameraMode === 'ship'} selector="body" />

      <CameraRig
        selectedObjectId={selectedObjectId}
        trackedObjectRefs={trackedObjectRefs}
        controlsRef={controlsRef}
        mode={cameraMode}
        homeView={HOME_VIEW}
        onTravelStateChange={(traveling) => {
          setIsTraveling(traveling)
          onTravelStateChange?.(traveling)
        }}
      />

      <FlightController
        enabled={cameraMode === 'ship'}
        controlsRef={controlsRef}
        warpEnabled={warpEnabled}
      />

      <EffectComposer>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.24} radius={0.84} />
        <Vignette offset={0.14} darkness={0.72} eskil={false} />
      </EffectComposer>
    </Canvas>
  )
}

export default SpaceScene
