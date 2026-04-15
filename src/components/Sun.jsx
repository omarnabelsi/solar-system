import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { spinObjectY } from '../systems/animationSystem'
import { useSafeTexture } from '../hooks/useSafeTexture'

const GLOW_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const GLOW_FRAGMENT_SHADER = `
  uniform float time;
  uniform vec3 glowColor;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.02;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec2 centeredUv = vUv * 2.0 - 1.0;

    float radial = 1.0 - smoothstep(0.0, 1.05, length(centeredUv));
    float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0), 2.2);

    float turbulence = fbm(vec3(vUv * 5.0, time * 0.12));
    float pulse = 0.93 + 0.07 * sin(time * 1.9);

    float glow = (radial * 0.45 + fresnel * 0.95) * (0.78 + turbulence * 0.22) * pulse * intensity;

    gl_FragColor = vec4(glowColor, glow);
  }
`

const SURFACE_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SURFACE_FRAGMENT_SHADER = `
  uniform float time;
  uniform vec3 colorA;
  uniform vec3 colorB;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 flowUv = vUv + vec2(time * 0.01, -time * 0.016);
    float n = noise(flowUv * 14.0) * 0.65 + noise(flowUv * 28.0) * 0.35;

    float bands = sin((vUv.y + time * 0.03) * 42.0 + n * 6.2831) * 0.5 + 0.5;
    float mask = clamp(n * 0.75 + bands * 0.25, 0.0, 1.0);

    vec3 color = mix(colorA, colorB, mask);
    float alpha = 0.08 + mask * 0.12;

    gl_FragColor = vec4(color, alpha);
  }
`

function Sun({ radius = 8.5, isPaused = false, trackRef }) {
  const coreRef = useRef(null)
  const glowRef = useRef(null)
  const coronaRef = useRef(null)
  const { gl } = useThree()
  const sunMap = useSafeTexture('/textures/planets/sunmap.jpg')

  const glowUniforms = useMemo(
    () => ({
      time: { value: 0 },
      glowColor: { value: new THREE.Color('#ffb86b') },
      intensity: { value: 0.95 },
    }),
    [],
  )

  const surfaceUniforms = useMemo(
    () => ({
      time: { value: 0 },
      colorA: { value: new THREE.Color('#ff9a44') },
      colorB: { value: new THREE.Color('#ffd168') },
    }),
    [],
  )

  useEffect(() => {
    if (!sunMap) {
      return
    }

    sunMap.colorSpace = THREE.SRGBColorSpace
    sunMap.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
    sunMap.needsUpdate = true
  }, [sunMap, gl])

  useFrame((state, delta) => {
    if (!isPaused && coreRef.current) {
      spinObjectY(coreRef.current, 0.14, delta)
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.45) * 0.014
      coreRef.current.scale.setScalar(pulse)
    }

    if (!isPaused && glowRef.current) {
      spinObjectY(glowRef.current, 0.05, delta)
    }

    if (!isPaused && coronaRef.current) {
      spinObjectY(coronaRef.current, -0.03, delta)
      const coronaPulse = 1 + Math.sin(state.clock.elapsedTime * 0.95) * 0.02
      coronaRef.current.scale.setScalar(coronaPulse)
    }

    glowUniforms.time.value = state.clock.elapsedTime
    surfaceUniforms.time.value = state.clock.elapsedTime
  })

  return (
    <group ref={trackRef}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[radius, 128, 128]} />
        <meshBasicMaterial
          map={sunMap}
          color="#ffd89d"
          toneMapped={false}
        />
      </mesh>

      <mesh scale={1.015}>
        <sphereGeometry args={[radius, 96, 96]} />
        <shaderMaterial
          uniforms={surfaceUniforms}
          vertexShader={SURFACE_VERTEX_SHADER}
          fragmentShader={SURFACE_FRAGMENT_SHADER}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={glowRef} scale={1.24}>
        <sphereGeometry args={[radius, 96, 96]} />
        <shaderMaterial
          uniforms={glowUniforms}
          vertexShader={GLOW_VERTEX_SHADER}
          fragmentShader={GLOW_FRAGMENT_SHADER}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={coronaRef} scale={1.4}>
        <sphereGeometry args={[radius, 72, 72]} />
        <meshBasicMaterial
          color="#ff9d4a"
          transparent
          opacity={0.17}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        position={[0, 0, 0]}
        intensity={2200}
        color="#ffd6a3"
        distance={0}
        decay={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={1700}
        shadow-bias={-0.00025}
      />
    </group>
  )
}

export default memo(Sun)
