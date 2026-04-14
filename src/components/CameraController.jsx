import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  isTravelRequired,
  resolveDestination,
  travelToPlanet,
  updateFollowCamera,
} from '../systems/cameraSystem'

function CameraController({
  selectedObjectId,
  trackedObjectsRef,
  controlsRef,
  cameraMode,
  homeView,
  onTransitionStateChange,
}) {
  const { camera } = useThree()

  const transitionRef = useRef(null)
  const transitioningRef = useRef(false)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    if (transitionRef.current) {
      transitionRef.current.kill()
      transitionRef.current = null
    }

    if (cameraMode === 'flight') {
      controls.enabled = false
      transitioningRef.current = false
      onTransitionStateChange?.(false)
      return
    }

    const destination = resolveDestination({
      selectedObjectId,
      trackedObjectsRef,
      homeView,
    })

    if (!isTravelRequired({ camera, controls, destination })) {
      controls.target.copy(destination.target)
      controls.enabled = true
      controls.update()
      transitioningRef.current = false
      onTransitionStateChange?.(false)
      return
    }

    transitionRef.current = travelToPlanet({
      camera,
      controls,
      targetPosition: destination.target,
      targetRadius: destination.radius || 2,
      duration: destination.hasObject ? 1.85 : 1.45,
      onStart: () => {
        controls.enabled = false
        transitioningRef.current = true
        onTransitionStateChange?.(true)
      },
      onComplete: ({ cameraPosition, target }) => {
        camera.position.copy(cameraPosition)
        controls.target.copy(target)
        controls.enabled = cameraMode !== 'flight'
        controls.update()
        transitioningRef.current = false
        onTransitionStateChange?.(false)
      },
    })

    return () => {
      if (transitionRef.current) {
        transitionRef.current.kill()
        transitionRef.current = null
      }
    }
  }, [
    selectedObjectId,
    cameraMode,
    camera,
    controlsRef,
    trackedObjectsRef,
    homeView,
    onTransitionStateChange,
  ])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || cameraMode === 'flight') {
      return
    }

    if (cameraMode === 'follow' && !transitioningRef.current && selectedObjectId) {
      const destination = resolveDestination({
        selectedObjectId,
        trackedObjectsRef,
        homeView,
      })

      if (destination.hasObject) {
        updateFollowCamera({
          camera,
          controls,
          destination,
          delta,
        })
        return
      }
    }

    if (!transitioningRef.current) {
      controls.update()
    }
  })

  return null
}

export default CameraController
