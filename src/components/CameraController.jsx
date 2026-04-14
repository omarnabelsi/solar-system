import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function CameraController({
  selectedPlanet,
  controlsRef,
  onTravelStateChange,
  homeView,
}) {
  const { camera } = useThree()

  const destinationPositionRef = useRef(new THREE.Vector3())
  const destinationTargetRef = useRef(new THREE.Vector3())
  const isTravelingRef = useRef(false)

  const homePosition = useMemo(
    () => new THREE.Vector3().fromArray(homeView.position),
    [homeView.position],
  )
  const homeTarget = useMemo(
    () => new THREE.Vector3().fromArray(homeView.target),
    [homeView.target],
  )

  const offsetDirection = useMemo(
    () => new THREE.Vector3(1, 0.42, 1.35).normalize(),
    [],
  )

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    if (selectedPlanet) {
      destinationTargetRef.current.fromArray(selectedPlanet.position)

      const offsetDistance = Math.max(selectedPlanet.size * 8, 18)
      destinationPositionRef.current
        .copy(destinationTargetRef.current)
        .addScaledVector(offsetDirection, offsetDistance)
    } else {
      destinationTargetRef.current.copy(homeTarget)
      destinationPositionRef.current.copy(homePosition)
    }

    const positionNeedsTravel =
      camera.position.distanceTo(destinationPositionRef.current) > 0.2
    const targetNeedsTravel =
      controls.target.distanceTo(destinationTargetRef.current) > 0.08
    const shouldTravel = positionNeedsTravel || targetNeedsTravel

    isTravelingRef.current = shouldTravel
    controls.enabled = !shouldTravel
    onTravelStateChange?.(shouldTravel)

    if (!shouldTravel) {
      controls.target.copy(destinationTargetRef.current)
      controls.update()
    }
  }, [
    selectedPlanet,
    controlsRef,
    onTravelStateChange,
    offsetDirection,
    camera,
    homePosition,
    homeTarget,
  ])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    if (!isTravelingRef.current) {
      controls.update()
      return
    }

    const positionAlpha = 1 - Math.exp(-delta * 2.5)
    const targetAlpha = 1 - Math.exp(-delta * 4.2)

    camera.position.lerp(destinationPositionRef.current, positionAlpha)
    controls.target.lerp(destinationTargetRef.current, targetAlpha)
    controls.update()

    const positionArrived = camera.position.distanceTo(destinationPositionRef.current) < 0.2
    const targetArrived = controls.target.distanceTo(destinationTargetRef.current) < 0.08

    if (positionArrived && targetArrived) {
      camera.position.copy(destinationPositionRef.current)
      controls.target.copy(destinationTargetRef.current)
      controls.enabled = true
      controls.update()
      isTravelingRef.current = false
      onTravelStateChange?.(false)
    }
  })

  return null
}

export default CameraController
