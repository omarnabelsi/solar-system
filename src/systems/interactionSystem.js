import * as THREE from 'three'

const SHARED_WORLD_POSITION = new THREE.Vector3()

export function setGlobalCursor(cursor) {
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.cursor = cursor
  }
}

export function clearGlobalCursor() {
  setGlobalCursor('default')
}

export function handlePointerOver(event, setHovered) {
  event.stopPropagation()
  setHovered(true)
  setGlobalCursor('pointer')
}

export function handlePointerOut(event, setHovered) {
  event.stopPropagation()
  setHovered(false)
  clearGlobalCursor()
}

export function buildSelectionPayload({ id, radius, objectRef }) {
  if (!objectRef?.current) {
    return { id, size: radius, position: [0, 0, 0] }
  }

  objectRef.current.getWorldPosition(SHARED_WORLD_POSITION)
  return {
    id,
    size: radius,
    position: SHARED_WORLD_POSITION.toArray(),
  }
}

export function dispatchSelection({ event, id, radius, objectRef, onSelect }) {
  event.stopPropagation()

  if (!onSelect) {
    return
  }

  const payload = buildSelectionPayload({ id, radius, objectRef })
  onSelect(payload.id, payload)
}
