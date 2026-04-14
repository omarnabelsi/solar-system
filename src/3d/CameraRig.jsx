import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'

function CameraRig({
  selectedObjectId,
  trackedObjectRefs,
  controlsRef,
  mode,
  homeView,
  onTravelStateChange,
}) {
  const { camera } = useThree()

  const transitionRef = useRef(null)
  const travelingRef = useRef(false)
  const tempTargetRef = useRef(new THREE.Vector3())

  const cameraOffset = useMemo(
    () => new THREE.Vector3(1.1, 0.46, 1.35).normalize(),
    [],
  )

  const homePosition = useMemo(
    () => new THREE.Vector3().fromArray(homeView.position),
    [homeView.position],
  )
  const homeTarget = useMemo(
    () => new THREE.Vector3().fromArray(homeView.target),
    [homeView.target],
  )

  const resolveTargetState = () => {
    const trackedObject = selectedObjectId ? trackedObjectRefs.current?.[selectedObjectId] : null

    if (!trackedObject?.node) {
      return {
        target: homeTarget.clone(),
        cameraPosition: homePosition.clone(),
      }
    }

    trackedObject.node.getWorldPosition(tempTargetRef.current)

    const offsetDistance = Math.max(trackedObject.radius * 10, 22)
    const desiredCamera = tempTargetRef.current
      .clone()
      .addScaledVector(cameraOffset, offsetDistance)

    return {
      target: tempTargetRef.current.clone(),
      cameraPosition: desiredCamera,
    }
  }

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    if (transitionRef.current) {
      transitionRef.current.kill()
      transitionRef.current = null
    }

    if (mode === 'ship') {
      travelingRef.current = false
      controls.enabled = false
      onTravelStateChange?.(false)
      return
    }

    const destination = resolveTargetState()

    const targetProxy = {
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    }

    travelingRef.current = true
    controls.enabled = false
    onTravelStateChange?.(true)

    const timeline = gsap.timeline({
      defaults: {
        duration: selectedObjectId ? 1.8 : 1.4,
        ease: 'power3.inOut',
      },
      onComplete: () => {
        controls.enabled = mode !== 'ship'
        travelingRef.current = false
        onTravelStateChange?.(false)
      },
    })

    timeline.to(
      camera.position,
      {
        x: destination.cameraPosition.x,
        y: destination.cameraPosition.y,
        z: destination.cameraPosition.z,
        onUpdate: () => {
          controls.update()
        },
      },
      0,
    )

    timeline.to(
      targetProxy,
      {
        x: destination.target.x,
        y: destination.target.y,
        z: destination.target.z,
        onUpdate: () => {
          controls.target.set(targetProxy.x, targetProxy.y, targetProxy.z)
          controls.update()
        },
      },
      0,
    )

    transitionRef.current = timeline

    return () => {
      if (transitionRef.current) {
        transitionRef.current.kill()
        transitionRef.current = null
      }
    }
  }, [
    selectedObjectId,
    mode,
    camera,
    controlsRef,
    homePosition,
    homeTarget,
    onTravelStateChange,
    trackedObjectRefs,
  ])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || mode === 'ship') {
      return
    }

    if (mode !== 'follow' || travelingRef.current || !selectedObjectId) {
      controls.update()
      return
    }

    const trackedObject = trackedObjectRefs.current?.[selectedObjectId]
    if (!trackedObject?.node) {
      controls.update()
      return
    }

    trackedObject.node.getWorldPosition(tempTargetRef.current)

    const desiredTarget = tempTargetRef.current.clone()
    const desiredCamera = desiredTarget
      .clone()
      .addScaledVector(cameraOffset, Math.max(trackedObject.radius * 9, 20))

    const cameraAlpha = 1 - Math.exp(-delta * 2.1)
    const targetAlpha = 1 - Math.exp(-delta * 4.1)

    camera.position.lerp(desiredCamera, cameraAlpha)
    controls.target.lerp(desiredTarget, targetAlpha)
    controls.update()
  })

  return null
}

export default CameraRig
