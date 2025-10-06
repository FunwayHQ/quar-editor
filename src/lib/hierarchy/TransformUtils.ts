import * as THREE from 'three'
import { useObjectsStore } from '../../stores/objectsStore'

/**
 * Transform utilities for object hierarchy
 * Handles conversions between local and world space
 */

/**
 * Get the world position of an object (accounting for parent transforms)
 */
export function getWorldPosition(objectId: string): THREE.Vector3 {
  const object = useObjectsStore.getState().objects.get(objectId)
  if (!object) return new THREE.Vector3()

  // Create Object3D hierarchy
  const obj3d = createObject3DHierarchy(objectId)

  const worldPos = new THREE.Vector3()
  obj3d.getWorldPosition(worldPos)

  return worldPos
}

/**
 * Get the world rotation of an object (accounting for parent transforms)
 * Returns Euler angles in radians
 */
export function getWorldRotation(objectId: string): THREE.Euler {
  const object = useObjectsStore.getState().objects.get(objectId)
  if (!object) return new THREE.Euler()

  const obj3d = createObject3DHierarchy(objectId)

  const worldQuat = new THREE.Quaternion()
  obj3d.getWorldQuaternion(worldQuat)

  const worldEuler = new THREE.Euler()
  worldEuler.setFromQuaternion(worldQuat)

  return worldEuler
}

/**
 * Get the world scale of an object (accounting for parent transforms)
 */
export function getWorldScale(objectId: string): THREE.Vector3 {
  const object = useObjectsStore.getState().objects.get(objectId)
  if (!object) return new THREE.Vector3(1, 1, 1)

  const obj3d = createObject3DHierarchy(objectId)

  const worldScale = new THREE.Vector3()
  obj3d.getWorldScale(worldScale)

  return worldScale
}

/**
 * Get the world matrix of an object
 */
export function getWorldMatrix(objectId: string): THREE.Matrix4 {
  const obj3d = createObject3DHierarchy(objectId)

  const worldMatrix = new THREE.Matrix4()
  obj3d.updateMatrixWorld(true)
  worldMatrix.copy(obj3d.matrixWorld)

  return worldMatrix
}

/**
 * Set world position and convert to local space for storage
 * Returns the new local position
 */
export function setWorldPosition(
  objectId: string,
  worldPosition: THREE.Vector3
): [number, number, number] {
  const object = useObjectsStore.getState().objects.get(objectId)
  if (!object) return [0, 0, 0]

  // If no parent, world = local
  if (!object.parentId) {
    return worldPosition.toArray() as [number, number, number]
  }

  // Get parent's world matrix
  const parentWorldMatrix = getWorldMatrix(object.parentId)

  // Invert to get local space
  const parentWorldMatrixInv = new THREE.Matrix4().copy(parentWorldMatrix).invert()

  // Transform world position to local space
  const localPos = worldPosition.clone().applyMatrix4(parentWorldMatrixInv)

  return localPos.toArray() as [number, number, number]
}

/**
 * Set world rotation and convert to local space for storage
 * Returns the new local rotation (Euler angles)
 */
export function setWorldRotation(
  objectId: string,
  worldRotation: THREE.Euler
): [number, number, number] {
  const object = useObjectsStore.getState().objects.get(objectId)
  if (!object) return [0, 0, 0]

  // If no parent, world = local
  if (!object.parentId) {
    return [worldRotation.x, worldRotation.y, worldRotation.z]
  }

  // Get parent's world rotation
  const parentWorldRotation = getWorldRotation(object.parentId)
  const parentQuat = new THREE.Quaternion().setFromEuler(parentWorldRotation)

  // Convert world rotation to quaternion
  const worldQuat = new THREE.Quaternion().setFromEuler(worldRotation)

  // Get local rotation: local = parentInv * world
  const parentQuatInv = parentQuat.clone().invert()
  const localQuat = parentQuatInv.multiply(worldQuat)

  // Convert back to Euler
  const localEuler = new THREE.Euler().setFromQuaternion(localQuat)

  return [localEuler.x, localEuler.y, localEuler.z]
}

/**
 * Set world scale and convert to local space for storage
 * Returns the new local scale
 */
export function setWorldScale(
  objectId: string,
  worldScale: THREE.Vector3
): [number, number, number] {
  const object = useObjectsStore.getState().objects.get(objectId)
  if (!object) return [1, 1, 1]

  // If no parent, world = local
  if (!object.parentId) {
    return worldScale.toArray() as [number, number, number]
  }

  // Get parent's world scale
  const parentWorldScale = getWorldScale(object.parentId)

  // Local scale = world scale / parent scale
  const localScale = new THREE.Vector3(
    parentWorldScale.x !== 0 ? worldScale.x / parentWorldScale.x : worldScale.x,
    parentWorldScale.y !== 0 ? worldScale.y / parentWorldScale.y : worldScale.y,
    parentWorldScale.z !== 0 ? worldScale.z / parentWorldScale.z : worldScale.z
  )

  return localScale.toArray() as [number, number, number]
}

/**
 * Get the local transform of an object (as stored in the scene)
 */
export function getLocalTransform(objectId: string): {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
} {
  const object = useObjectsStore.getState().objects.get(objectId)
  if (!object) {
    return {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1),
    }
  }

  return {
    position: new THREE.Vector3(...object.position),
    rotation: new THREE.Euler(...object.rotation),
    scale: new THREE.Vector3(...object.scale),
  }
}

/**
 * Convert a point from world space to local space relative to an object
 */
export function worldToLocal(objectId: string, worldPoint: THREE.Vector3): THREE.Vector3 {
  const worldMatrix = getWorldMatrix(objectId)
  const worldMatrixInv = new THREE.Matrix4().copy(worldMatrix).invert()

  return worldPoint.clone().applyMatrix4(worldMatrixInv)
}

/**
 * Convert a point from local space to world space relative to an object
 */
export function localToWorld(objectId: string, localPoint: THREE.Vector3): THREE.Vector3 {
  const worldMatrix = getWorldMatrix(objectId)

  return localPoint.clone().applyMatrix4(worldMatrix)
}

/**
 * Helper: Create a Three.js Object3D hierarchy for an object
 * This builds the full parent chain to get accurate world transforms
 */
function createObject3DHierarchy(objectId: string): THREE.Object3D {
  const store = useObjectsStore.getState()
  const object = store.objects.get(objectId)
  if (!object) return new THREE.Object3D()

  // Create Object3D for this object
  const obj3d = new THREE.Object3D()
  obj3d.position.fromArray(object.position)
  obj3d.rotation.fromArray(object.rotation)
  obj3d.scale.fromArray(object.scale)

  // Traverse up the hierarchy
  let currentObj = object
  let currentObj3d = obj3d

  while (currentObj.parentId) {
    const parent = store.objects.get(currentObj.parentId)
    if (!parent) break

    // Create parent Object3D
    const parentObj3d = new THREE.Object3D()
    parentObj3d.position.fromArray(parent.position)
    parentObj3d.rotation.fromArray(parent.rotation)
    parentObj3d.scale.fromArray(parent.scale)

    // Add current as child
    parentObj3d.add(currentObj3d)

    // Move up the chain
    currentObj = parent
    currentObj3d = parentObj3d
  }

  // Update matrices
  currentObj3d.updateMatrixWorld(true)

  return obj3d
}

/**
 * Calculate the center position of a group of objects (in world space)
 */
export function calculateGroupCenter(objectIds: string[]): [number, number, number] {
  if (objectIds.length === 0) return [0, 0, 0]

  const center = new THREE.Vector3()

  objectIds.forEach(id => {
    const worldPos = getWorldPosition(id)
    center.add(worldPos)
  })

  center.divideScalar(objectIds.length)

  return center.toArray() as [number, number, number]
}

/**
 * Check if creating a parent-child relationship would create a circular dependency
 * Returns true if circular (invalid)
 */
export function wouldCreateCircularDependency(
  childId: string,
  newParentId: string
): boolean {
  const store = useObjectsStore.getState()

  // Can't be parent of itself
  if (childId === newParentId) return true

  // Check if newParent is already a descendant of child
  let current = newParentId
  let visited = new Set<string>()

  while (current) {
    if (current === childId) return true
    if (visited.has(current)) return true // Circular already exists

    visited.add(current)

    const obj = store.objects.get(current)
    if (!obj || !obj.parentId) break

    current = obj.parentId
  }

  return false
}

/**
 * Get all descendants of an object (children, grandchildren, etc.)
 */
export function getAllDescendants(objectId: string): string[] {
  const store = useObjectsStore.getState()
  const object = store.objects.get(objectId)
  if (!object) return []

  const descendants: string[] = []

  function traverse(id: string) {
    const obj = store.objects.get(id)
    if (!obj) return

    obj.children.forEach(childId => {
      descendants.push(childId)
      traverse(childId) // Recursive
    })
  }

  traverse(objectId)

  return descendants
}

/**
 * Get the depth of an object in the hierarchy (root = 0)
 */
export function getHierarchyDepth(objectId: string): number {
  const store = useObjectsStore.getState()
  let depth = 0
  let current = objectId

  while (current) {
    const obj = store.objects.get(current)
    if (!obj || !obj.parentId) break

    depth++
    current = obj.parentId

    // Safety check: prevent infinite loops
    if (depth > 100) break
  }

  return depth
}
