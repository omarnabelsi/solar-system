import { memo, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'

const BASE_SPEED = 24
const BOOST_MULTIPLIER = 2.35
const WARP_MULTIPLIER = 1.7
const ACCELERATION = 12
const DRAG = 4.5

function SpaceshipControls({ enabled, warpEnabled = false }) {
  const { camera } = useThree()
  const velocityRef = useRef(new THREE.Vector3())
  const zeroVelocityRef = useRef(new THREE.Vector3())
  const inputDirectionRef = useRef(new THREE.Vector3())
  const worldDirectionRef = useRef(new THREE.Vector3())
  const keyStateRef = useRef({
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false,
    ShiftLeft: false,
    ShiftRight: false,
    ControlLeft: false,
    ControlRight: false,
    KeyC: false,
  })

  useEffect(() => {
    const setKeyState = (code, value) => {
      if (Object.prototype.hasOwnProperty.call(keyStateRef.current, code)) {
        keyStateRef.current[code] = value
      }
    }

    const handleKeyDown = (event) => {
      setKeyState(event.code, true)
    }

    const handleKeyUp = (event) => {
      setKeyState(event.code, false)
    }

    const handleWindowBlur = () => {
      Object.keys(keyStateRef.current).forEach((code) => {
        keyStateRef.current[code] = false
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      velocityRef.current.set(0, 0, 0)
    }
  }, [enabled])

  useFrame((_, delta) => {
    if (!enabled) {
      return
    }

    const keys = keyStateRef.current
    const forward = Number(keys.KeyW) - Number(keys.KeyS)
    const right = Number(keys.KeyD) - Number(keys.KeyA)
    const up = Number(keys.Space) - Number(keys.ControlLeft || keys.ControlRight || keys.KeyC)

    inputDirectionRef.current.set(right, up, -forward)

    if (inputDirectionRef.current.lengthSq() > 0) {
      inputDirectionRef.current.normalize()
      worldDirectionRef.current.copy(inputDirectionRef.current).applyQuaternion(camera.quaternion)
    } else {
      worldDirectionRef.current.set(0, 0, 0)
    }

    const isBoosting = keys.ShiftLeft || keys.ShiftRight
    const speedMultiplier = (isBoosting ? BOOST_MULTIPLIER : 1) * (warpEnabled ? WARP_MULTIPLIER : 1)
    const targetVelocity = worldDirectionRef.current.multiplyScalar(BASE_SPEED * speedMultiplier)

    const accelBlend = 1 - Math.exp(-ACCELERATION * delta)
    const dragBlend = 1 - Math.exp(-DRAG * delta)

    if (targetVelocity.lengthSq() > 0.0001) {
      velocityRef.current.lerp(targetVelocity, accelBlend)
    } else {
      velocityRef.current.lerp(zeroVelocityRef.current, dragBlend)
    }

    camera.position.addScaledVector(velocityRef.current, delta)
  })

  return <PointerLockControls enabled={enabled} selector="canvas" />
}

export default memo(SpaceshipControls)
