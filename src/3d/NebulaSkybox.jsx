import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function createNebulaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#040715')
  gradient.addColorStop(0.35, '#1a1333')
  gradient.addColorStop(0.72, '#12233f')
  gradient.addColorStop(1, '#060914')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 12; i += 1) {
    const cx = Math.random() * canvas.width
    const cy = Math.random() * canvas.height
    const radius = 120 + Math.random() * 280
    const nebula = context.createRadialGradient(cx, cy, 20, cx, cy, radius)
    nebula.addColorStop(0, `rgba(145, 96, 255, ${0.2 + Math.random() * 0.15})`)
    nebula.addColorStop(0.55, `rgba(71, 154, 255, ${0.1 + Math.random() * 0.12})`)
    nebula.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = nebula
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  }

  for (let i = 0; i < 1800; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const size = Math.random() * 2.2
    const alpha = 0.15 + Math.random() * 0.8
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`
    context.fillRect(x, y, size, size)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true

  return texture
}

function NebulaSkybox() {
  const sphereRef = useRef(null)
  const nebulaTexture = useMemo(() => createNebulaTexture(), [])

  useFrame((_, delta) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += 0.004 * delta
    }
  })

  return (
    <mesh ref={sphereRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[1900, 72, 72]} />
      <meshBasicMaterial map={nebulaTexture || undefined} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  )
}

export default NebulaSkybox
