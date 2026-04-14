import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import CameraController from './CameraController'
import Controls from './Controls'
import SolarSystem from './SolarSystem'
import { HOME_VIEW } from '../3d/sceneData'

function createNebulaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#040715')
  gradient.addColorStop(0.35, '#1a1333')
  gradient.addColorStop(0.72, '#12233f')
  gradient.addColorStop(1, '#060914')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 12; i += 1) {
    const cx = Math.random() * canvas.width
    const cy = Math.random() * canvas.height
    const radius = 120 + Math.random() * 280
    const nebula = context.createRadialGradient(cx, cy, 20, cx, cy, radius)
    nebula.addColorStop(0, 'rgba(145, 96, 255, 0.26)')
    nebula.addColorStop(0.55, 'rgba(71, 154, 255, 0.18)')
    nebula.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = nebula
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  }

  for (let i = 0; i < 1800; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const size = Math.random() * 2.2
    const alpha = 0.15 + Math.random() * 0.8
    context.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')'
    context.fillRect(x, y, size, size)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true

  return texture
}

function NebulaSkybox() {
  const skyRef = useRef(null)
  const nebulaTexture = useMemo(() => createNebulaTexture(), [])

  useFrame((_, delta) => {
    if (skyRef.current) {
      skyRef.current.rotation.y += 0.004 * delta
    }
  })

  return (
    <mesh ref={skyRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[1900, 72, 72]} />
      <meshBasicMaterial
        map={nebulaTexture || undefined}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  )
}

function Scene({
  selectedObjectId,
  onSelectObject,
  cameraMode,
  warpEnabled,
  onTravelStateChange,
}) {
  const controlsRef = useRef(null)
  const trackedObjectsRef = useRef({})
  const [isTransitioning, setIsTransitioning] = useState(false)

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
        if (cameraMode !== 'flight') {
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

      <SolarSystem
        selectedObjectId={selectedObjectId}
        onSelectObject={onSelectObject}
        trackedObjectsRef={trackedObjectsRef}
      />

      <Controls
        controlsRef={controlsRef}
        cameraMode={cameraMode}
        warpEnabled={warpEnabled}
        isTransitioning={isTransitioning}
      />

      <CameraController
        selectedObjectId={selectedObjectId}
        trackedObjectsRef={trackedObjectsRef}
        controlsRef={controlsRef}
        cameraMode={cameraMode}
        homeView={HOME_VIEW}
        onTransitionStateChange={(nextState) => {
          setIsTransitioning(nextState)
          onTravelStateChange?.(nextState)
        }}
      />

      <EffectComposer>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.24} radius={0.84} />
        <Vignette offset={0.14} darkness={0.72} eskil={false} />
      </EffectComposer>
    </Canvas>
  )
}

export default Scene
