import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'

function Controls({ controlsRef, cameraMode, warpEnabled, isTransitioning }) {
  const { camera } = useThree()

  const keyStateRef = useRef({})
  const velocityRef = useRef(new THREE.Vector3())
  const desiredVelocityRef = useRef(new THREE.Vector3())
  const forwardRef = useRef(new THREE.Vector3())
  const inputVectorRef = useRef(new THREE.Vector3())
  const zeroVectorRef = useRef(new THREE.Vector3(0, 0, 0))

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
    const isFlightMode = cameraMode === 'flight'

    if (!isFlightMode) {
      return
    }

    const keys = keyStateRef.current
    const forwardInput = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0)
    const strafeInput = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)
    const verticalInput = (keys.Space ? 1 : 0) - (keys.ControlLeft || keys.ControlRight ? 1 : 0)

    const boostMultiplier = keys.ShiftLeft || keys.ShiftRight ? 2.4 : 1
    const warpMultiplier = warpEnabled ? 3.5 : 1
    const movementSpeed = 24 * boostMultiplier * warpMultiplier

    inputVectorRef.current.set(strafeInput, verticalInput * 0.85, -forwardInput)

    if (inputVectorRef.current.lengthSq() > 0) {
      inputVectorRef.current.normalize().multiplyScalar(movementSpeed)
      desiredVelocityRef.current.copy(inputVectorRef.current).applyQuaternion(camera.quaternion)
    } else {
      desiredVelocityRef.current.set(0, 0, 0)
    }

    const acceleration = 1 - Math.exp(-delta * 4.3)
    const drag = 1 - Math.exp(-delta * 2.4)

    velocityRef.current.lerp(desiredVelocityRef.current, acceleration)
    if (inputVectorRef.current.lengthSq() === 0) {
      velocityRef.current.lerp(zeroVectorRef.current, drag)
    }

    camera.position.addScaledVector(velocityRef.current, delta)

    if (controls) {
      // In flight mode, the orbit target follows the forward direction for smooth inertial steering.
      forwardRef.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
      controls.target.copy(camera.position).addScaledVector(forwardRef.current, 20)
      controls.update()
    }
  })

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={cameraMode !== 'flight' && !isTransitioning}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.46}
        zoomSpeed={0.8}
        panSpeed={0.6}
        minDistance={18}
        maxDistance={1150}
        maxPolarAngle={Math.PI * 0.95}
      />

      <PointerLockControls enabled={cameraMode === 'flight'} selector="body" />
    </>
  )
}

export default Controls
