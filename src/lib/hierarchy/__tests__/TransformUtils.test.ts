import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { useObjectsStore } from '../../../stores/objectsStore'
import {
  getWorldPosition,
  getWorldRotation,
  getWorldScale,
  getWorldMatrix,
  setWorldPosition,
  setWorldRotation,
  setWorldScale,
  getLocalTransform,
  worldToLocal,
  localToWorld,
  calculateGroupCenter,
  wouldCreateCircularDependency,
  getAllDescendants,
  getHierarchyDepth,
} from '../TransformUtils'

describe('TransformUtils', () => {
  beforeEach(() => {
    // Reset store
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
    })
  })

  describe('getWorldPosition', () => {
    it('should return object position when no parent', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [5, 10, 15],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldPos = getWorldPosition('obj1')

      expect(worldPos.x).toBeCloseTo(5)
      expect(worldPos.y).toBeCloseTo(10)
      expect(worldPos.z).toBeCloseTo(15)
    })

    it('should calculate world position with parent', () => {
      const store = useObjectsStore.getState()

      // Parent at (10, 0, 0)
      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [10, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      // Child at local (5, 0, 0)
      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [5, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldPos = getWorldPosition('child')

      // World position should be 10 + 5 = 15
      expect(worldPos.x).toBeCloseTo(15)
      expect(worldPos.y).toBeCloseTo(0)
      expect(worldPos.z).toBeCloseTo(0)
    })

    it('should handle nested hierarchy (3 levels)', () => {
      const store = useObjectsStore.getState()

      store.objects.set('grandparent', {
        id: 'grandparent',
        name: 'Grandparent',
        type: 'cube',
        position: [10, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: ['parent'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [5, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'grandparent',
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [3, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldPos = getWorldPosition('child')

      // World position = 10 + 5 + 3 = 18
      expect(worldPos.x).toBeCloseTo(18)
    })

    it('should return zero vector for non-existent object', () => {
      const worldPos = getWorldPosition('nonexistent')

      expect(worldPos.x).toBe(0)
      expect(worldPos.y).toBe(0)
      expect(worldPos.z).toBe(0)
    })
  })

  describe('getWorldRotation', () => {
    it('should return object rotation when no parent', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, Math.PI / 2, 0], // 90 degrees around Y
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldRot = getWorldRotation('obj1')

      expect(worldRot.x).toBeCloseTo(0)
      expect(worldRot.y).toBeCloseTo(Math.PI / 2)
      expect(worldRot.z).toBeCloseTo(0)
    })

    it('should combine parent and child rotations', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, Math.PI / 4, 0], // 45 degrees
        scale: [1, 1, 1],
        parentId: null,
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, Math.PI / 4, 0], // 45 degrees
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldRot = getWorldRotation('child')

      // Combined rotation = 45 + 45 = 90 degrees
      expect(worldRot.y).toBeCloseTo(Math.PI / 2, 4)
    })
  })

  describe('getWorldScale', () => {
    it('should return object scale when no parent', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [2, 3, 4],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldScale = getWorldScale('obj1')

      expect(worldScale.x).toBeCloseTo(2)
      expect(worldScale.y).toBeCloseTo(3)
      expect(worldScale.z).toBeCloseTo(4)
    })

    it('should multiply parent and child scales', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [2, 2, 2],
        parentId: null,
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [3, 3, 3],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldScale = getWorldScale('child')

      // World scale = 2 * 3 = 6
      expect(worldScale.x).toBeCloseTo(6)
      expect(worldScale.y).toBeCloseTo(6)
      expect(worldScale.z).toBeCloseTo(6)
    })
  })

  describe('setWorldPosition', () => {
    it('should return world position when no parent', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const localPos = setWorldPosition('obj1', new THREE.Vector3(10, 20, 30))

      expect(localPos[0]).toBeCloseTo(10)
      expect(localPos[1]).toBeCloseTo(20)
      expect(localPos[2]).toBeCloseTo(30)
    })

    it('should convert world position to local with parent', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [10, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      // Set world position to (15, 0, 0)
      // Parent is at (10, 0, 0)
      // Local should be (5, 0, 0)
      const localPos = setWorldPosition('child', new THREE.Vector3(15, 0, 0))

      expect(localPos[0]).toBeCloseTo(5)
      expect(localPos[1]).toBeCloseTo(0)
      expect(localPos[2]).toBeCloseTo(0)
    })
  })

  describe('setWorldRotation', () => {
    it('should return world rotation when no parent', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const localRot = setWorldRotation('obj1', new THREE.Euler(0, Math.PI / 2, 0))

      expect(localRot[0]).toBeCloseTo(0)
      expect(localRot[1]).toBeCloseTo(Math.PI / 2)
      expect(localRot[2]).toBeCloseTo(0)
    })

    it('should convert world rotation to local with parent', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, Math.PI / 4, 0], // 45 degrees
        scale: [1, 1, 1],
        parentId: null,
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      // Set world rotation to 90 degrees
      // Parent is at 45 degrees
      // Local should be 45 degrees
      const localRot = setWorldRotation('child', new THREE.Euler(0, Math.PI / 2, 0))

      expect(localRot[1]).toBeCloseTo(Math.PI / 4, 4)
    })
  })

  describe('setWorldScale', () => {
    it('should return world scale when no parent', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const localScale = setWorldScale('obj1', new THREE.Vector3(2, 3, 4))

      expect(localScale[0]).toBeCloseTo(2)
      expect(localScale[1]).toBeCloseTo(3)
      expect(localScale[2]).toBeCloseTo(4)
    })

    it('should convert world scale to local with parent', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [2, 2, 2],
        parentId: null,
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      // Set world scale to 6
      // Parent scale is 2
      // Local should be 3
      const localScale = setWorldScale('child', new THREE.Vector3(6, 6, 6))

      expect(localScale[0]).toBeCloseTo(3)
      expect(localScale[1]).toBeCloseTo(3)
      expect(localScale[2]).toBeCloseTo(3)
    })

    it('should handle parent scale of zero', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [0, 1, 1],
        parentId: null,
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      const localScale = setWorldScale('child', new THREE.Vector3(5, 5, 5))

      // Should not divide by zero
      expect(localScale[0]).toBeCloseTo(5)
      expect(localScale[1]).toBeCloseTo(5)
      expect(localScale[2]).toBeCloseTo(5)
    })
  })

  describe('getLocalTransform', () => {
    it('should return local transform values', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [1, 2, 3],
        rotation: [0.1, 0.2, 0.3],
        scale: [2, 3, 4],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const transform = getLocalTransform('obj1')

      expect(transform.position.x).toBe(1)
      expect(transform.position.y).toBe(2)
      expect(transform.position.z).toBe(3)
      expect(transform.rotation.x).toBeCloseTo(0.1)
      expect(transform.rotation.y).toBeCloseTo(0.2)
      expect(transform.rotation.z).toBeCloseTo(0.3)
      expect(transform.scale.x).toBe(2)
      expect(transform.scale.y).toBe(3)
      expect(transform.scale.z).toBe(4)
    })

    it('should return defaults for non-existent object', () => {
      const transform = getLocalTransform('nonexistent')

      expect(transform.position.x).toBe(0)
      expect(transform.scale.x).toBe(1)
    })
  })

  describe('worldToLocal / localToWorld', () => {
    it('should convert between world and local space', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [10, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const worldPoint = new THREE.Vector3(15, 0, 0)
      const localPoint = worldToLocal('parent', worldPoint)

      expect(localPoint.x).toBeCloseTo(5)

      const backToWorld = localToWorld('parent', localPoint)

      expect(backToWorld.x).toBeCloseTo(15)
    })
  })

  describe('calculateGroupCenter', () => {
    it('should return zero for empty array', () => {
      const center = calculateGroupCenter([])

      expect(center).toEqual([0, 0, 0])
    })

    it('should return single object position', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [5, 10, 15],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const center = calculateGroupCenter(['obj1'])

      expect(center[0]).toBeCloseTo(5)
      expect(center[1]).toBeCloseTo(10)
      expect(center[2]).toBeCloseTo(15)
    })

    it('should calculate average position of multiple objects', () => {
      const store = useObjectsStore.getState()

      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      store.objects.set('obj2', {
        id: 'obj2',
        name: 'Object 2',
        type: 'cube',
        position: [10, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const center = calculateGroupCenter(['obj1', 'obj2'])

      expect(center[0]).toBeCloseTo(5)
      expect(center[1]).toBeCloseTo(0)
      expect(center[2]).toBeCloseTo(0)
    })
  })

  describe('wouldCreateCircularDependency', () => {
    it('should return true if child === parent', () => {
      const result = wouldCreateCircularDependency('obj1', 'obj1')

      expect(result).toBe(true)
    })

    it('should return false for valid parent-child relationship', () => {
      const store = useObjectsStore.getState()

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const result = wouldCreateCircularDependency('child', 'parent')

      expect(result).toBe(false)
    })

    it('should detect circular dependency (grandchild → grandparent)', () => {
      const store = useObjectsStore.getState()

      store.objects.set('grandparent', {
        id: 'grandparent',
        name: 'Grandparent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: ['parent'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('parent', {
        id: 'parent',
        name: 'Parent',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'grandparent',
        children: ['child'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child', {
        id: 'child',
        name: 'Child',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'parent',
        children: [],
        visible: true,
        material: null,
      } as any)

      // Try to make grandparent a child of child (circular!)
      const result = wouldCreateCircularDependency('grandparent', 'child')

      expect(result).toBe(true)
    })
  })

  describe('getAllDescendants', () => {
    it('should return empty array for object with no children', () => {
      const store = useObjectsStore.getState()
      store.objects.set('obj1', {
        id: 'obj1',
        name: 'Object 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const descendants = getAllDescendants('obj1')

      expect(descendants).toEqual([])
    })

    it('should return all descendants (multi-level)', () => {
      const store = useObjectsStore.getState()

      store.objects.set('root', {
        id: 'root',
        name: 'Root',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: ['child1', 'child2'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child1', {
        id: 'child1',
        name: 'Child 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'root',
        children: ['grandchild1'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('child2', {
        id: 'child2',
        name: 'Child 2',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'root',
        children: [],
        visible: true,
        material: null,
      } as any)

      store.objects.set('grandchild1', {
        id: 'grandchild1',
        name: 'Grandchild 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'child1',
        children: [],
        visible: true,
        material: null,
      } as any)

      const descendants = getAllDescendants('root')

      expect(descendants).toContain('child1')
      expect(descendants).toContain('child2')
      expect(descendants).toContain('grandchild1')
      expect(descendants.length).toBe(3)
    })
  })

  describe('getHierarchyDepth', () => {
    it('should return 0 for root object', () => {
      const store = useObjectsStore.getState()
      store.objects.set('root', {
        id: 'root',
        name: 'Root',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        visible: true,
        material: null,
      } as any)

      const depth = getHierarchyDepth('root')

      expect(depth).toBe(0)
    })

    it('should return correct depth for nested objects', () => {
      const store = useObjectsStore.getState()

      store.objects.set('root', {
        id: 'root',
        name: 'Root',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: ['level1'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('level1', {
        id: 'level1',
        name: 'Level 1',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'root',
        children: ['level2'],
        visible: true,
        material: null,
      } as any)

      store.objects.set('level2', {
        id: 'level2',
        name: 'Level 2',
        type: 'cube',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: 'level1',
        children: [],
        visible: true,
        material: null,
      } as any)

      expect(getHierarchyDepth('root')).toBe(0)
      expect(getHierarchyDepth('level1')).toBe(1)
      expect(getHierarchyDepth('level2')).toBe(2)
    })
  })
})
