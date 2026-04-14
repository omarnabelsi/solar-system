import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const warnedTexturePaths = new Set()

function warnTextureFailure(path, error) {
  if (!path || warnedTexturePaths.has(path)) {
    return
  }

  warnedTexturePaths.add(path)
  console.warn(`[textures] Failed to load ${path}`, error)
}

function disposeTexture(texture) {
  if (texture && typeof texture.dispose === 'function') {
    texture.dispose()
  }
}

export function useSafeTexture(path) {
  const [texture, setTexture] = useState(null)
  const textureRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    if (!path) {
      if (textureRef.current) {
        disposeTexture(textureRef.current)
        textureRef.current = null
      }
      setTexture(null)
      return () => {
        cancelled = true
      }
    }

    const loader = new THREE.TextureLoader()

    loader.load(
      path,
      (nextTexture) => {
        if (cancelled) {
          disposeTexture(nextTexture)
          return
        }

        if (textureRef.current && textureRef.current !== nextTexture) {
          disposeTexture(textureRef.current)
        }

        textureRef.current = nextTexture
        setTexture(nextTexture)
      },
      undefined,
      (error) => {
        if (cancelled) {
          return
        }

        warnTextureFailure(path, error)

        if (textureRef.current) {
          disposeTexture(textureRef.current)
          textureRef.current = null
        }

        setTexture(null)
      },
    )

    return () => {
      cancelled = true
    }
  }, [path])

  useEffect(() => {
    return () => {
      if (textureRef.current) {
        disposeTexture(textureRef.current)
        textureRef.current = null
      }
    }
  }, [])

  return texture
}

export function useSafeTextureMap(entries) {
  const normalizedEntries = useMemo(
    () => entries.filter(([key, path]) => Boolean(key) && Boolean(path)),
    [entries],
  )
  const entrySignature = useMemo(
    () => normalizedEntries.map(([key, path]) => `${key}:${path}`).join('|'),
    [normalizedEntries],
  )

  const [textures, setTextures] = useState({})
  const loadedTexturesRef = useRef({})
  const latestEntriesRef = useRef(normalizedEntries)

  latestEntriesRef.current = normalizedEntries

  useEffect(() => {
    let cancelled = false
    const activeEntries = latestEntriesRef.current

    if (!activeEntries.length) {
      Object.values(loadedTexturesRef.current).forEach(disposeTexture)
      loadedTexturesRef.current = {}
      setTextures({})
      return () => {
        cancelled = true
      }
    }

    const loader = new THREE.TextureLoader()
    const jobs = activeEntries.map(([key, path]) => {
      return new Promise((resolve) => {
        loader.load(
          path,
          (texture) => resolve([key, texture]),
          undefined,
          (error) => {
            warnTextureFailure(path, error)
            resolve([key, null])
          },
        )
      })
    })

    Promise.all(jobs).then((results) => {
      const nextTextures = {}

      results.forEach(([key, texture]) => {
        if (texture) {
          nextTextures[key] = texture
        }
      })

      if (cancelled) {
        Object.values(nextTextures).forEach(disposeTexture)
        return
      }

      Object.entries(loadedTexturesRef.current).forEach(([key, texture]) => {
        if (texture !== nextTextures[key]) {
          disposeTexture(texture)
        }
      })

      loadedTexturesRef.current = nextTextures
      setTextures(nextTextures)
    })

    return () => {
      cancelled = true
    }
  }, [entrySignature])

  useEffect(() => {
    return () => {
      Object.values(loadedTexturesRef.current).forEach(disposeTexture)
      loadedTexturesRef.current = {}
    }
  }, [])

  return textures
}