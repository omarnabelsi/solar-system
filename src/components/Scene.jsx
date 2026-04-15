import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import CameraController from './CameraController'
import Controls from './Controls'
import SpaceshipControls from './SpaceshipControls'
import SolarSystem from './SolarSystem'
import { useSafeTexture } from '../hooks/useSafeTexture'
import { HOME_VIEW } from '../3d/sceneData'

const ENABLE_POSTPROCESSING = import.meta.env.PROD

function NebulaCloudLayer() {
  const cloudRef = useRef(null)
  const nebulaMap = useMemo(() => createNebulaTexture(), [])

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y -= 0.00065 * delta
    }
  })

  useEffect(() => {
    return () => {
      if (nebulaMap) {
        nebulaMap.dispose()
      }
    }
  }, [nebulaMap])

  return (
    <mesh ref={cloudRef} scale={[-1, 1, 1]} renderOrder={-2}>
      <sphereGeometry args={[2140, 64, 64]} />
      <meshBasicMaterial
        map={nebulaMap || undefined}
        side={THREE.BackSide}
        transparent
        opacity={0.12}
        depthWrite={false}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

function createNebulaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  context.clearRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 16; i += 1) {
    const cx = Math.random() * canvas.width
    const cy = Math.random() * canvas.height
    const radius = 180 + Math.random() * 340

    const gradient = context.createRadialGradient(cx, cy, 10, cx, cy, radius)
    gradient.addColorStop(0, 'rgba(94, 167, 255, 0.22)')
    gradient.addColorStop(0.45, 'rgba(140, 93, 255, 0.14)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    context.fillStyle = gradient
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(1.2, 1)
  texture.needsUpdate = true

  return texture
}

function StarfieldSky() {
  const skyRef = useRef(null)
  const { gl } = useThree()
  const starfieldMap = useSafeTexture('/textures/space/galaxy_starfield.png')

  useEffect(() => {
    if (!starfieldMap) {
      return
    }

    starfieldMap.colorSpace = THREE.SRGBColorSpace
    starfieldMap.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
    starfieldMap.wrapS = THREE.RepeatWrapping
    starfieldMap.wrapT = THREE.ClampToEdgeWrapping
    starfieldMap.repeat.set(1.5, 1)
    starfieldMap.needsUpdate = true
  }, [starfieldMap, gl])

  useFrame((_, delta) => {
    if (skyRef.current) {
      skyRef.current.rotation.y += 0.0016 * delta
    }
  })

  return (
    <mesh ref={skyRef} scale={[-1, 1, 1]} renderOrder={-1}>
      <sphereGeometry args={[2300, 64, 64]} />
      <meshBasicMaterial
        map={starfieldMap || undefined}
        color="#1a2543"
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  )
}

function Scene({
  selectedPlanet,
  onSelectPlanet,
  cameraMode,
  warpEnabled,
  isTraveling,
  onTravelStateChange,
  onCameraModeChange,
}) {
  const controlsRef = useRef(null)
  const trackedObjectsRef = useRef({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const selectedObjectId = selectedPlanet?.id || null
  const isSimulationPaused = cameraMode === 'planetFocus'
  const isSelectionLocked = isTransitioning || isTraveling || cameraMode === 'tour'

  const handleTransitionStateChange = useCallback(
    (nextState) => {
      setIsTransitioning(nextState)
      onTravelStateChange?.(nextState)
    },
    [onTravelStateChange],
  )

  return (
    <Canvas
      shadows
      camera={{
        position: HOME_VIEW.position,
        fov: 42,
        near: 0.1,
        far: 5000,
      }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl: renderer }) => {
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 0.72
      }}
      onPointerMissed={() => {
        if (cameraMode === 'orbit' && !isSelectionLocked) {
          onSelectPlanet(null)
        }
      }}
    >
      <color attach="background" args={['#02030d']} />

      <NebulaCloudLayer />
      <StarfieldSky />
      <Stars radius={2400} depth={1300} count={18000} factor={7.5} saturation={0} fade speed={0.08} />

      <ambientLight intensity={0.06} />
      <directionalLight
        position={[180, 120, -40]}
        intensity={0.15}
        color="#9bb8ff"
      />
      <Environment preset="night" blur={0.5} background={false} intensity={0.18} />

      <SolarSystem
        selectedObjectId={selectedObjectId}
        onSelectObject={onSelectPlanet}
        trackedObjectsRef={trackedObjectsRef}
        cameraMode={cameraMode}
        isPaused={isSimulationPaused}
        selectionLocked={isSelectionLocked}
      />

      <Controls
        controlsRef={controlsRef}
        cameraMode={cameraMode}
        isTransitioning={isTransitioning}
        selectedPlanet={selectedPlanet}
      />

      <SpaceshipControls
        enabled={cameraMode === 'spaceship' && !isSelectionLocked}
        warpEnabled={warpEnabled}
      />

      <CameraController
        selectedPlanet={selectedPlanet}
        trackedObjectsRef={trackedObjectsRef}
        controlsRef={controlsRef}
        cameraMode={cameraMode}
        homeView={HOME_VIEW}
        onTransitionStateChange={handleTransitionStateChange}
        onCameraModeChange={onCameraModeChange}
      />

      {ENABLE_POSTPROCESSING ? (
        <EffectComposer multisampling={0} depthBuffer stencilBuffer={false}>
          <Bloom
            intensity={0.72}
            luminanceThreshold={0.46}
            luminanceSmoothing={0.18}
            radius={0.55}
          />
          <Vignette offset={0.14} darkness={0.58} eskil={false} />
        </EffectComposer>
      ) : null}
    </Canvas>
  )
}

export default Scene
