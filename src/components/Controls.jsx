import { memo } from 'react'
import { OrbitControls } from '@react-three/drei'

function Controls({ controlsRef, cameraMode, isTransitioning, selectedPlanet }) {
  const isPlanetFocus = cameraMode === 'planetFocus'
  const isOrbitMode = cameraMode === 'orbit'
  const controlsEnabled = (isOrbitMode || isPlanetFocus) && !isTransitioning
  const focusRadius = Math.max(selectedPlanet?.size || 2, 1.5)
  const minDistance = isPlanetFocus ? Math.max(focusRadius * 1.85, 2.8) : 18
  const maxDistance = isPlanetFocus ? Math.max(focusRadius * 42, 40) : 1150

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={controlsEnabled}
      target={[0, 0, 0]}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={isPlanetFocus ? 0.62 : 0.46}
      zoomSpeed={0.85}
      panSpeed={0.6}
      enablePan={!isPlanetFocus}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI * 0.95}
    />
  )
}

export default memo(Controls)
