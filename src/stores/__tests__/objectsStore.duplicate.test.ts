/**
 * ObjectsStore - Duplicate Geometry Tests
 *
 * Verifies that duplicated objects get deep-cloned geometry,
 * not shared references to the same BufferGeometry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { useObjectsStore } from '../objectsStore';

describe('objectsStore - duplicate geometry isolation', () => {
  beforeEach(() => {
    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
      transformMode: 'translate',
    });
  });

  it('should deep-clone renderGeometry when duplicating objects', () => {
    const store = useObjectsStore.getState();

    // Create an object and give it a renderGeometry
    const obj = store.createPrimitive('box');
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    store.addObject({
      ...obj,
      renderGeometry: geometry,
    });

    // Duplicate it
    store.setSelectedIds([obj.id]);
    store.duplicateObjects([obj.id]);

    // Find the duplicated object
    const allObjects = store.getAllObjects();
    const duplicated = allObjects.find(o => o.id !== obj.id);
    const original = allObjects.find(o => o.id === obj.id);

    expect(duplicated).toBeDefined();
    expect(original).toBeDefined();

    if (duplicated?.renderGeometry && original?.renderGeometry) {
      // They should NOT be the same object reference
      expect(duplicated.renderGeometry).not.toBe(original.renderGeometry);

      // But should have the same vertex data
      const origPos = original.renderGeometry.attributes.position;
      const dupPos = duplicated.renderGeometry.attributes.position;
      expect(dupPos.count).toBe(origPos.count);
    }
  });

  it('should not include qMesh reference in duplicated object', () => {
    const store = useObjectsStore.getState();

    const obj = store.createPrimitive('box');
    store.addObject({
      ...obj,
      qMesh: { fake: 'qmesh' } as any, // Simulate a QMesh reference
    });

    store.duplicateObjects([obj.id]);

    const allObjects = store.getAllObjects();
    const duplicated = allObjects.find(o => o.id !== obj.id);

    expect(duplicated).toBeDefined();
    // qMesh should NOT be copied (it's stripped in the destructuring)
    expect(duplicated?.qMesh).toBeUndefined();
  });

  it('should give duplicated objects unique IDs', () => {
    const store = useObjectsStore.getState();

    const obj1 = store.createPrimitive('box');
    const obj2 = store.createPrimitive('sphere');
    store.addObject(obj1);
    store.addObject(obj2);

    store.duplicateObjects([obj1.id, obj2.id]);

    const allObjects = store.getAllObjects();
    const ids = allObjects.map(o => o.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
    expect(allObjects.length).toBe(4); // 2 original + 2 duplicates
  });

  it('should offset duplicated objects by 0.5 on X and Z', () => {
    const store = useObjectsStore.getState();

    const obj = store.createPrimitive('box');
    store.addObject(obj);

    store.duplicateObjects([obj.id]);

    const allObjects = store.getAllObjects();
    const duplicated = allObjects.find(o => o.id !== obj.id);

    expect(duplicated).toBeDefined();
    expect(duplicated!.position[0]).toBe(obj.position[0] + 0.5);
    expect(duplicated!.position[1]).toBe(obj.position[1]);
    expect(duplicated!.position[2]).toBe(obj.position[2] + 0.5);
  });
});
