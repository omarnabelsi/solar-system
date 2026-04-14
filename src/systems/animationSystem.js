import * as THREE from 'three'

export function frameLerpAlpha(strength, delta) {
  return 1 - Math.exp(-strength * delta)
}

export function dampScalar(current, target, smoothing, delta) {
  return THREE.MathUtils.damp(current, target, smoothing, delta)
}

export function dampVector3(current, target, smoothing, delta) {
  const alpha = frameLerpAlpha(smoothing, delta)
  current.lerp(target, alpha)
  return current
}

export function spinObjectY(object3D, speed, delta) {
  if (object3D) {
    object3D.rotation.y += speed * delta
  }
}

export function orbitObjectY(object3D, speed, delta) {
  if (object3D) {
    object3D.rotation.y += speed * delta
  }
}
