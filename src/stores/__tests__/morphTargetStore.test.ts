/**
 * Morph Target Store Tests
 *
 * Comprehensive tests for shape keys/morph targets system
 * Sprint 7: Vertex Animation System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { useMorphTargetStore } from '../morphTargetStore';

describe('MorphTargetStore', () => {
  let objectId: string;
  let geometry: THREE.BufferGeometry;

  beforeEach(() => {
    // Reset store
    useMorphTargetStore.setState({
      shapeKeysByObject: new Map(),
      activeShapeKeyId: null,
      basePoses: new Map(),
    });

    objectId = 'test-object-1';
    geometry = new THREE.BoxGeometry(1, 1, 1);
  });

  describe('Base Pose Management', () => {
    it('should store base pose', () => {
      const { storeBasePose, getBasePose } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);

      const basePose = getBasePose(objectId);
      expect(basePose).toBeDefined();
      expect(basePose?.attributes.position).toBeDefined();
    });

    it('should clone geometry when storing base pose', () => {
      const { storeBasePose, getBasePose } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);

      const basePose = getBasePose(objectId);
      expect(basePose).not.toBe(geometry); // Should be a clone
    });

    it('should handle multiple objects', () => {
      const { storeBasePose, getBasePose } = useMorphTargetStore.getState();

      const obj1 = 'object-1';
      const obj2 = 'object-2';
      const geo1 = new THREE.BoxGeometry(1, 1, 1);
      const geo2 = new THREE.SphereGeometry(0.5);

      storeBasePose(obj1, geo1);
      storeBasePose(obj2, geo2);

      expect(getBasePose(obj1)).toBeDefined();
      expect(getBasePose(obj2)).toBeDefined();
      expect(getBasePose(obj1)).not.toBe(getBasePose(obj2));
    });
  });

  describe('Shape Key Creation', () => {
    it('should create shape key', () => {
      const { storeBasePose, createShapeKey, getShapeKeysForObject } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test Shape');

      expect(shapeKey).toBeDefined();
      expect(shapeKey?.name).toBe('Test Shape');
      expect(shapeKey?.objectId).toBe(objectId);

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys).toHaveLength(1);
    });

    it('should auto-name shape keys if no name provided', () => {
      const { storeBasePose, createShapeKey } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId);

      expect(shapeKey?.name).toMatch(/Shape Key \d+/);
    });

    it('should warn if no base pose stored', () => {
      const { createShapeKey } = useMorphTargetStore.getState();
      const consoleSpy = vi.spyOn(console, 'warn');

      const shapeKey = createShapeKey(objectId, 'Test');

      expect(consoleSpy).toHaveBeenCalledWith('No base pose stored for object', objectId);
      expect(shapeKey).toBeNull();
    });

    it('should create multiple shape keys for same object', () => {
      const { storeBasePose, createShapeKey, getShapeKeysForObject } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      createShapeKey(objectId, 'Shape 1');
      createShapeKey(objectId, 'Shape 2');
      createShapeKey(objectId, 'Shape 3');

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys).toHaveLength(3);
    });

    it('should initialize shape key with value 0', () => {
      const { storeBasePose, createShapeKey } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      expect(shapeKey?.value).toBe(0);
    });
  });

  describe('Capture Current as Shape Key', () => {
    it('should capture current geometry as shape key', () => {
      const { captureCurrentAsShapeKey, getShapeKeysForObject } = useMorphTargetStore.getState();

      const shapeKey = captureCurrentAsShapeKey(objectId, geometry, 'Captured');

      expect(shapeKey).toBeDefined();
      expect(shapeKey?.name).toBe('Captured');
      expect(shapeKey?.positions).toBeDefined();

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys).toHaveLength(1);
    });

    it('should store base pose if not already stored', () => {
      const { captureCurrentAsShapeKey, getBasePose } = useMorphTargetStore.getState();

      expect(getBasePose(objectId)).toBeUndefined();

      captureCurrentAsShapeKey(objectId, geometry, 'Test');

      expect(getBasePose(objectId)).toBeDefined();
    });

    it('should store normals if available', () => {
      const { captureCurrentAsShapeKey } = useMorphTargetStore.getState();

      geometry.computeVertexNormals();
      const shapeKey = captureCurrentAsShapeKey(objectId, geometry, 'Test');

      expect(shapeKey?.normals).toBeDefined();
    });
  });

  describe('Shape Key Updates', () => {
    it('should update shape key properties', () => {
      const { storeBasePose, createShapeKey, updateShapeKey, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Original');

      updateShapeKey(shapeKey!.id, { name: 'Updated Name' });

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys[0].name).toBe('Updated Name');
    });

    it('should set shape key value', () => {
      const { storeBasePose, createShapeKey, setShapeKeyValue, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      setShapeKeyValue(shapeKey!.id, 0.75);

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys[0].value).toBe(0.75);
    });

    it('should clamp shape key value between 0 and 1', () => {
      const { storeBasePose, createShapeKey, setShapeKeyValue, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      setShapeKeyValue(shapeKey!.id, 1.5); // Over max
      expect(getShapeKeysForObject(objectId)[0].value).toBe(1);

      setShapeKeyValue(shapeKey!.id, -0.5); // Under min
      expect(getShapeKeysForObject(objectId)[0].value).toBe(0);
    });
  });

  describe('Shape Key Deletion', () => {
    it('should delete shape key', () => {
      const { storeBasePose, createShapeKey, deleteShapeKey, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey1 = createShapeKey(objectId, 'Shape 1');
      const shapeKey2 = createShapeKey(objectId, 'Shape 2');

      deleteShapeKey(shapeKey1!.id);

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys).toHaveLength(1);
      expect(shapeKeys[0].id).toBe(shapeKey2!.id);
    });

    it('should clear active shape key when deleted', () => {
      const { storeBasePose, createShapeKey, setActiveShapeKey, deleteShapeKey } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      setActiveShapeKey(shapeKey!.id);
      expect(useMorphTargetStore.getState().activeShapeKeyId).toBe(shapeKey!.id);

      deleteShapeKey(shapeKey!.id);
      expect(useMorphTargetStore.getState().activeShapeKeyId).toBeNull();
    });
  });

  describe('Active Shape Key', () => {
    it('should set active shape key', () => {
      const { storeBasePose, createShapeKey, setActiveShapeKey } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      setActiveShapeKey(shapeKey!.id);

      expect(useMorphTargetStore.getState().activeShapeKeyId).toBe(shapeKey!.id);
    });

    it('should clear active shape key', () => {
      const { storeBasePose, createShapeKey, setActiveShapeKey } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');
      setActiveShapeKey(shapeKey!.id);

      setActiveShapeKey(null);

      expect(useMorphTargetStore.getState().activeShapeKeyId).toBeNull();
    });
  });

  describe('Blend Shape Keys', () => {
    it('should blend shape keys based on values', () => {
      const { storeBasePose, captureCurrentAsShapeKey, setShapeKeyValue, blendShapeKeys } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);

      // Create modified geometry for shape key
      const modifiedGeo = geometry.clone();
      const positions = modifiedGeo.attributes.position;
      positions.setXYZ(0, 2, 2, 2); // Move first vertex
      modifiedGeo.attributes.position.needsUpdate = true;

      const shapeKey = captureCurrentAsShapeKey(objectId, modifiedGeo, 'Modified');
      setShapeKeyValue(shapeKey!.id, 0.5);

      const blended = blendShapeKeys(objectId);

      expect(blended).toBeDefined();
      expect(blended).toBeInstanceOf(Float32Array);
    });

    it('should return null if no base pose', () => {
      const { blendShapeKeys } = useMorphTargetStore.getState();

      const result = blendShapeKeys(objectId);

      expect(result).toBeNull();
    });

    it('should return null if no shape keys', () => {
      const { storeBasePose, blendShapeKeys } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);

      const result = blendShapeKeys(objectId);

      expect(result).toBeNull();
    });

    it('should blend multiple shape keys', () => {
      const { storeBasePose, captureCurrentAsShapeKey, setShapeKeyValue, blendShapeKeys } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);

      // Create two shape keys
      const geo1 = geometry.clone();
      const positions1 = geo1.attributes.position;
      positions1.setXYZ(0, 1, 1, 1);

      const geo2 = geometry.clone();
      const positions2 = geo2.attributes.position;
      positions2.setXYZ(0, -1, -1, -1);

      const key1 = captureCurrentAsShapeKey(objectId, geo1, 'Key1');
      const key2 = captureCurrentAsShapeKey(objectId, geo2, 'Key2');

      setShapeKeyValue(key1!.id, 0.5);
      setShapeKeyValue(key2!.id, 0.3);

      const blended = blendShapeKeys(objectId);

      expect(blended).toBeDefined();
      expect(blended?.length).toBeGreaterThan(0);
    });
  });

  describe('Clear Shape Keys', () => {
    it('should clear all shape keys for object', () => {
      const { storeBasePose, createShapeKey, clearShapeKeysForObject, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      createShapeKey(objectId, 'Shape 1');
      createShapeKey(objectId, 'Shape 2');

      expect(getShapeKeysForObject(objectId)).toHaveLength(2);

      clearShapeKeysForObject(objectId);

      expect(getShapeKeysForObject(objectId)).toHaveLength(0);
    });

    it('should clear base pose when clearing shape keys', () => {
      const { storeBasePose, clearShapeKeysForObject, getBasePose } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      expect(getBasePose(objectId)).toBeDefined();

      clearShapeKeysForObject(objectId);

      expect(getBasePose(objectId)).toBeUndefined();
    });

    it('should not affect other objects', () => {
      const { storeBasePose, createShapeKey, clearShapeKeysForObject, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      const obj1 = 'object-1';
      const obj2 = 'object-2';

      storeBasePose(obj1, geometry);
      storeBasePose(obj2, geometry.clone());
      createShapeKey(obj1, 'Shape 1');
      createShapeKey(obj2, 'Shape 2');

      clearShapeKeysForObject(obj1);

      expect(getShapeKeysForObject(obj1)).toHaveLength(0);
      expect(getShapeKeysForObject(obj2)).toHaveLength(1);
    });
  });

  describe('Apply Shape Key', () => {
    it('should set shape key value when applying', () => {
      const { storeBasePose, createShapeKey, applyShapeKey, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      applyShapeKey(objectId, shapeKey!.id, 0.8);

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys[0].value).toBe(0.8);
    });

    it('should default to value 1 if not specified', () => {
      const { storeBasePose, createShapeKey, applyShapeKey, getShapeKeysForObject } =
        useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      applyShapeKey(objectId, shapeKey!.id);

      const shapeKeys = getShapeKeysForObject(objectId);
      expect(shapeKeys[0].value).toBe(1);
    });

    it('should handle non-existent shape key gracefully', () => {
      const { applyShapeKey } = useMorphTargetStore.getState();

      // Should not throw
      expect(() => applyShapeKey(objectId, 'non-existent-id')).not.toThrow();
    });
  });

  describe('Get Shape Keys', () => {
    it('should return empty array for object with no shape keys', () => {
      const { getShapeKeysForObject } = useMorphTargetStore.getState();

      const shapeKeys = getShapeKeysForObject(objectId);

      expect(shapeKeys).toEqual([]);
    });

    it('should return all shape keys for object', () => {
      const { storeBasePose, createShapeKey, getShapeKeysForObject } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      createShapeKey(objectId, 'Key 1');
      createShapeKey(objectId, 'Key 2');
      createShapeKey(objectId, 'Key 3');

      const shapeKeys = getShapeKeysForObject(objectId);

      expect(shapeKeys).toHaveLength(3);
      expect(shapeKeys[0].name).toBe('Key 1');
      expect(shapeKeys[1].name).toBe('Key 2');
      expect(shapeKeys[2].name).toBe('Key 3');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', () => {
      const {
        storeBasePose,
        createShapeKey,
        setShapeKeyValue,
        blendShapeKeys,
        getShapeKeysForObject,
      } = useMorphTargetStore.getState();

      // 1. Store base pose
      storeBasePose(objectId, geometry);

      // 2. Create shape keys
      const key1 = createShapeKey(objectId, 'Smile');
      const key2 = createShapeKey(objectId, 'Frown');

      // 3. Set values
      setShapeKeyValue(key1!.id, 0.7);
      setShapeKeyValue(key2!.id, 0.3);

      // 4. Blend
      const blended = blendShapeKeys(objectId);

      // Verify complete workflow
      expect(getShapeKeysForObject(objectId)).toHaveLength(2);
      expect(blended).toBeDefined();
    });

    it('should preserve shape keys across value changes', () => {
      const { storeBasePose, createShapeKey, setShapeKeyValue } = useMorphTargetStore.getState();

      storeBasePose(objectId, geometry);
      const shapeKey = createShapeKey(objectId, 'Test');

      setShapeKeyValue(shapeKey!.id, 0.5);
      setShapeKeyValue(shapeKey!.id, 0.8);
      setShapeKeyValue(shapeKey!.id, 0.2);

      expect(useMorphTargetStore.getState().getShapeKeysForObject(objectId)).toHaveLength(1);
    });
  });
});
