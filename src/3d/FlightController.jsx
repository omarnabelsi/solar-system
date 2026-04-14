import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function FlightController({ enabled, controlsRef, warpEnabled }) {
  const { camera } = useThree()

  const keyStateRef = useRef({})
  const velocityRef = useRef(new THREE.Vector3())
  const desiredVelocityRef = useRef(new THREE.Vector3())
  const forwardRef = useRef(new THREE.Vector3())

  useEffect(() => {
    const handleKeyDown = (event) => {
      keyStateRef.current[event.code] = true
    }

    const handleKeyUp = (event) => {
      keyStateRef.current[event.code] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    const keys = keyStateRef.current

    if (!enabled) {
      const stopFactor = 1 - Math.exp(-delta * 6)
      velocityRef.current.lerp(new THREE.Vector3(0, 0, 0), stopFactor)
      if (controls) {
        controls.update()
      }
      return
    }

    const forwardInput = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0)
    const strafeInput = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)
    const verticalInput = (keys.Space ? 1 : 0) - (keys.ControlLeft || keys.ControlRight ? 1 : 0)

    const boostMultiplier = keys.ShiftLeft || keys.ShiftRight ? 2.4 : 1
    const warpMultiplier = warpEnabled ? 3.5 : 1

    const baseSpeed = 24
    const movementSpeed = baseSpeed * boostMultiplier * warpMultiplier

    const inputVector = new THREE.Vector3(
      strafeInput,
      verticalInput * 0.85,
      -forwardInput,
    )

    if (inputVector.lengthSq() > 0) {
      inputVector.normalize().multiplyScalar(movementSpeed)
      desiredVelocityRef.current.copy(inputVector).applyQuaternion(camera.quaternion)
    } else {
      desiredVelocityRef.current.set(0, 0, 0)
    }

    const acceleration = 1 - Math.exp(-delta * 4.3)
    const drag = 1 - Math.exp(-delta * 2.4)

    velocityRef.current.lerp(desiredVelocityRef.current, acceleration)
    if (inputVector.lengthSq() === 0) {
      velocityRef.current.lerp(new THREE.Vector3(0, 0, 0), drag)
    }

    camera.position.addScaledVector(velocityRef.current, delta)

    if (controls) {
      forwardRef.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
      controls.target.copy(camera.position).addScaledVector(forwardRef.current, 20)
      controls.update()
    }
  })

  return null
}

export default FlightController
