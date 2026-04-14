import gsap from 'gsap'
import * as THREE from 'three'
import { frameLerpAlpha } from './animationSystem'

export const CAMERA_OFFSET_DIRECTION = new THREE.Vector3(1.05, 0.45, 1.32).normalize()

function vectorFromArray(value, fallback = [0, 0, 0]) {
  if (value instanceof THREE.Vector3) {
    return value.clone()
  }

  const source = Array.isArray(value) ? value : fallback
  return new THREE.Vector3(source[0], source[1], source[2])
}

export function getDynamicZoomDistance(planetRadius) {
  return THREE.MathUtils.clamp(planetRadius * 11.5, 20, 150)
}

export function computeCameraDestination({
  targetPosition,
  targetRadius,
  offsetDirection = CAMERA_OFFSET_DIRECTION,
}) {
  const destination = vectorFromArray(targetPosition)
  const zoomDistance = getDynamicZoomDistance(targetRadius)
  destination.addScaledVector(offsetDirection, zoomDistance)
  return destination
}

export function resolveDestination({ selectedObjectId, trackedObjectsRef, homeView }) {
  if (!selectedObjectId) {
    return {
      hasObject: false,
      id: null,
      radius: 0,
      target: vectorFromArray(homeView.target),
      cameraPosition: vectorFromArray(homeView.position),
    }
  }

  const trackedObject = trackedObjectsRef.current?.[selectedObjectId]
  if (!trackedObject?.node) {
    return {
      hasObject: false,
      id: null,
      radius: 0,
      target: vectorFromArray(homeView.target),
      cameraPosition: vectorFromArray(homeView.position),
    }
  }

  const worldPosition = new THREE.Vector3()
  trackedObject.node.getWorldPosition(worldPosition)

  return {
    hasObject: true,
    id: selectedObjectId,
    radius: trackedObject.radius || 2,
    target: worldPosition,
    cameraPosition: computeCameraDestination({
      targetPosition: worldPosition,
      targetRadius: trackedObject.radius || 2,
    }),
  }
}

export function isTravelRequired({
  camera,
  controls,
  destination,
  positionTolerance = 0.2,
  targetTolerance = 0.08,
}) {
  const positionGap = camera.position.distanceTo(destination.cameraPosition)
  const targetGap = controls.target.distanceTo(destination.target)
  return positionGap > positionTolerance || targetGap > targetTolerance
}

export function travelToPlanet({
  camera,
  controls,
  targetPosition,
  targetRadius,
  duration = 1.8,
  ease = 'power3.inOut',
  onStart,
  onComplete,
}) {
  const destinationTarget = vectorFromArray(targetPosition)
  const destinationPosition = computeCameraDestination({
    targetPosition: destinationTarget,
    targetRadius,
  })

  const targetProxy = {
    x: controls.target.x,
    y: controls.target.y,
    z: controls.target.z,
  }

  const timeline = gsap.timeline({
    defaults: {
      duration,
      ease,
    },
    onStart,
    onComplete: () => {
      onComplete?.({
        cameraPosition: destinationPosition,
        target: destinationTarget,
      })
    },
  })

  timeline.to(
    camera.position,
    {
      x: destinationPosition.x,
      y: destinationPosition.y,
      z: destinationPosition.z,
      onUpdate: () => {
        controls.update()
      },
    },
    0,
  )

  timeline.to(
    targetProxy,
    {
      x: destinationTarget.x,
      y: destinationTarget.y,
      z: destinationTarget.z,
      onUpdate: () => {
        controls.target.set(targetProxy.x, targetProxy.y, targetProxy.z)
        controls.update()
      },
    },
    0,
  )

  return timeline
}

export function updateFollowCamera({ camera, controls, destination, delta }) {
  const cameraAlpha = frameLerpAlpha(2.1, delta)
  const targetAlpha = frameLerpAlpha(4.3, delta)

  camera.position.lerp(destination.cameraPosition, cameraAlpha)
  controls.target.lerp(destination.target, targetAlpha)
  controls.update()
}
