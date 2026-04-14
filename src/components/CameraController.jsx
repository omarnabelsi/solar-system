import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import {
  isTravelRequired,
  resolveDestination,
  travelToPlanet,
} from '../systems/cameraSystem'

const HOME_TRANSITION_DURATION = 1.35
const PLANET_FOCUS_TRANSITION_DURATION = 1.85
const TOUR_TRANSITION_DURATION = 2.25

function CameraController({
  selectedPlanet,
  trackedObjectsRef,
  controlsRef,
  cameraMode,
  homeView,
  onTransitionStateChange,
  onCameraModeChange,
}) {
  const { camera } = useThree()

  const transitionRef = useRef(null)
  const transitioningRef = useRef(false)
  const trackingAnchorRef = useRef(new THREE.Vector3())
  const trackingDeltaRef = useRef(new THREE.Vector3())
  const hasTrackingAnchorRef = useRef(false)

  const homePosition = useMemo(() => new THREE.Vector3().fromArray(homeView.position), [homeView.position])
  const homeTarget = useMemo(() => new THREE.Vector3().fromArray(homeView.target), [homeView.target])

  const selectedObjectId = selectedPlanet?.id || null

  const setTransitioning = useCallback(
    (nextState) => {
      if (transitioningRef.current === nextState) {
        return
      }

      transitioningRef.current = nextState
      onTransitionStateChange?.(nextState)
    },
    [onTransitionStateChange],
  )

  const resetTrackingAnchor = useCallback(() => {
    hasTrackingAnchorRef.current = false
  }, [])

  const cancelTransition = useCallback(() => {
    if (transitionRef.current) {
      transitionRef.current.kill()
      transitionRef.current = null
    }

    setTransitioning(false)
  }, [setTransitioning])

  useEffect(() => {
    return () => {
      cancelTransition()
    }
  }, [cancelTransition])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    cancelTransition()
    resetTrackingAnchor()

    if (cameraMode === 'spaceship') {
      controls.enabled = false
      return
    }

    if (cameraMode === 'orbit') {
      controls.enabled = true

      if (!selectedObjectId) {
        const homeDestination = {
          cameraPosition: homePosition,
          target: homeTarget,
        }

        if (!isTravelRequired({ camera, controls, destination: homeDestination })) {
          controls.target.copy(homeTarget)
          controls.update()
          return
        }

        const targetProxy = {
          x: controls.target.x,
          y: controls.target.y,
          z: controls.target.z,
        }

        transitionRef.current = gsap.timeline({
          defaults: {
            duration: HOME_TRANSITION_DURATION,
            ease: 'power2.inOut',
          },
          onStart: () => {
            controls.enabled = false
            setTransitioning(true)
          },
          onComplete: () => {
            transitionRef.current = null
            camera.position.copy(homePosition)
            controls.target.copy(homeTarget)
            controls.enabled = true
            controls.update()
            setTransitioning(false)
          },
        })

        transitionRef.current.to(
          camera.position,
          {
            x: homePosition.x,
            y: homePosition.y,
            z: homePosition.z,
            onUpdate: () => {
              controls.update()
            },
          },
          0,
        )

        transitionRef.current.to(
          targetProxy,
          {
            x: homeTarget.x,
            y: homeTarget.y,
            z: homeTarget.z,
            onUpdate: () => {
              controls.target.set(targetProxy.x, targetProxy.y, targetProxy.z)
              controls.update()
            },
          },
          0,
        )

        return
      }

      controls.update()
      return
    }

    if (!selectedObjectId) {
      controls.enabled = false
      controls.target.copy(homeTarget)
      controls.update()

      if (cameraMode === 'planetFocus') {
        onCameraModeChange?.('orbit')
      }

      return
    }

    const destination = resolveDestination({
      selectedPlanet,
      selectedObjectId,
      trackedObjectsRef,
      homeView,
    })

    if (!destination.hasObject) {
      controls.enabled = false
      controls.target.copy(homeTarget)
      controls.update()

      if (cameraMode === 'planetFocus') {
        onCameraModeChange?.('orbit')
      }

      return
    }

    controls.enabled = false

    if (!isTravelRequired({ camera, controls, destination })) {
      camera.position.copy(destination.cameraPosition)
      controls.target.copy(destination.target)
      controls.enabled = cameraMode === 'planetFocus'
      controls.update()
      return
    }

    transitionRef.current = travelToPlanet({
      camera,
      controls,
      targetPosition: destination.target,
      targetRadius: destination.radius || 2,
      duration: cameraMode === 'tour' ? TOUR_TRANSITION_DURATION : PLANET_FOCUS_TRANSITION_DURATION,
      onStart: () => {
        controls.enabled = false
        setTransitioning(true)
      },
      onComplete: ({ cameraPosition, target }) => {
        transitionRef.current = null
        camera.position.copy(cameraPosition)
        controls.target.copy(target)
        controls.enabled = cameraMode === 'planetFocus'
        controls.update()
        setTransitioning(false)
        resetTrackingAnchor()
      },
    })

    return () => {
      cancelTransition()
    }
  }, [
    selectedPlanet,
    selectedObjectId,
    cameraMode,
    camera,
    controlsRef,
    trackedObjectsRef,
    homeView,
    homePosition,
    homeTarget,
    onCameraModeChange,
    setTransitioning,
    cancelTransition,
    resetTrackingAnchor,
  ])

  useFrame((state, delta) => {
    const controls = controlsRef.current
    if (!controls || cameraMode === 'spaceship' || transitioningRef.current) {
      return
    }

    if ((cameraMode === 'planetFocus' || cameraMode === 'tour') && selectedObjectId) {
      const destination = resolveDestination({
        selectedPlanet,
        selectedObjectId,
        trackedObjectsRef,
        homeView,
      })

      if (!destination.hasObject) {
        return
      }

      if (!hasTrackingAnchorRef.current) {
        trackingAnchorRef.current.copy(destination.target)
        hasTrackingAnchorRef.current = true
      }

      trackingDeltaRef.current.subVectors(destination.target, trackingAnchorRef.current)
      camera.position.add(trackingDeltaRef.current)
      controls.target.copy(destination.target)
      trackingAnchorRef.current.copy(destination.target)

      if (cameraMode === 'tour') {
        camera.lookAt(destination.target)
      }

      controls.update()
      return
    }

    controls.update()
  })

  return null
}

export default CameraController
