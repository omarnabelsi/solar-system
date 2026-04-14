import gsap from 'gsap'
import * as THREE from 'three'

export const CAMERA_OFFSET_DIRECTION = new THREE.Vector3(1.05, 0.45, 1.32).normalize()

function vectorFromArray(value, fallback = [0, 0, 0]) {
  if (value instanceof THREE.Vector3) {
    return value.clone()
  }

  const source = Array.isArray(value) ? value : fallback
  return new THREE.Vector3(source[0], source[1], source[2])
}

function resolveSelectionId(selectedPlanet, selectedObjectId) {
  if (typeof selectedPlanet === 'string' && selectedPlanet) {
    return selectedPlanet
  }

  if (selectedPlanet?.id) {
    return selectedPlanet.id
  }

  if (typeof selectedObjectId === 'string' && selectedObjectId) {
    return selectedObjectId
  }

  return null
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

export function resolveDestination({ selectedPlanet, selectedObjectId, trackedObjectsRef, homeView }) {
  const homeTarget = vectorFromArray(homeView?.target)
  const homePosition = vectorFromArray(homeView?.position, [0, 120, 280])
  const selectionId = resolveSelectionId(selectedPlanet, selectedObjectId)

  if (!selectionId) {
    return {
      hasObject: false,
      id: null,
      radius: 0,
      target: homeTarget,
      cameraPosition: homePosition,
    }
  }

  const trackedObject = trackedObjectsRef.current?.[selectionId]
  if (trackedObject?.node) {
    const worldPosition = new THREE.Vector3()
    trackedObject.node.getWorldPosition(worldPosition)
    const trackedRadius = trackedObject.radius || selectedPlanet?.size || 2

    return {
      hasObject: true,
      id: selectionId,
      radius: trackedRadius,
      target: worldPosition,
      cameraPosition: computeCameraDestination({
        targetPosition: worldPosition,
        targetRadius: trackedRadius,
      }),
    }
  }

  if (Array.isArray(selectedPlanet?.position)) {
    const knownPosition = vectorFromArray(selectedPlanet.position)
    const trackedRadius = selectedPlanet.size || 2

    return {
      hasObject: true,
      id: selectionId,
      radius: trackedRadius,
      target: knownPosition,
      cameraPosition: computeCameraDestination({
        targetPosition: knownPosition,
        targetRadius: trackedRadius,
      }),
    }
  }

  return {
    hasObject: false,
    id: null,
    radius: 0,
    target: homeTarget,
    cameraPosition: homePosition,
  }
}

export function isTravelRequired({
  camera,
  controls,
  destination,
  positionTolerance = 0.2,
  targetTolerance = 0.08,
}) {
  if (!camera || !controls || !destination) {
    return false
  }

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
  if (!camera || !destination) {
    return
  }

  const cameraAlpha = THREE.MathUtils.clamp(delta * 6.2, 0.04, 0.22)
  const targetAlpha = THREE.MathUtils.clamp(delta * 9.2, 0.08, 0.32)

  camera.position.lerp(destination.cameraPosition, cameraAlpha)

  if (controls) {
    controls.target.lerp(destination.target, targetAlpha)
    controls.update()
    return
  }

  camera.lookAt(destination.target)
}
