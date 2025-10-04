/**
 * Modifier Store Tests
 *
 * Comprehensive tests for non-destructive modifier stack
 * Sprint 7: Export System + Polygon Editing MVP - Day 3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { useModifierStore } from '../modifierStore';

describe('ModifierStore', () => {
  let objectId: string;
  let geometry: THREE.BufferGeometry;

  beforeEach(() => {
    // Reset store
    useModifierStore.setState({
      modifiersByObject: new Map(),
    });

    objectId = 'test-object-1';

    // Create test geometry
    geometry = new THREE.BoxGeometry(1, 1, 1);
  });

  describe('addModifier', () => {
    it('should add a subdivision modifier', () => {
      const { addModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision');

      expect(modifier).toBeDefined();
      expect(modifier.type).toBe('subdivision');
      expect(modifier.enabled).toBe(true);

      const modifiers = getModifiers(objectId);
      expect(modifiers).toHaveLength(1);
      expect(modifiers[0]).toBe(modifier);
    });

    it('should add a mirror modifier', () => {
      const { addModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'mirror', {
        mirrorAxis: 'y',
      });

      expect(modifier.type).toBe('mirror');
      expect(modifier.params.mirrorAxis).toBe('y');

      const modifiers = getModifiers(objectId);
      expect(modifiers).toHaveLength(1);
    });

    it('should add an array modifier', () => {
      const { addModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'array', {
        arrayCount: 5,
      });

      expect(modifier.type).toBe('array');
      expect(modifier.params.arrayCount).toBe(5);

      const modifiers = getModifiers(objectId);
      expect(modifiers).toHaveLength(1);
    });

    it('should add multiple modifiers to same object', () => {
      const { addModifier, getModifiers } = useModifierStore.getState();

      addModifier(objectId, 'subdivision');
      addModifier(objectId, 'mirror');
      addModifier(objectId, 'array');

      const modifiers = getModifiers(objectId);
      expect(modifiers).toHaveLength(3);
      expect(modifiers[0].type).toBe('subdivision');
      expect(modifiers[1].type).toBe('mirror');
      expect(modifiers[2].type).toBe('array');
    });

    it('should use default parameters when not provided', () => {
      const { addModifier } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision');

      expect(modifier.params.levels).toBe(1);
      expect(modifier.params.subdivisionAlgorithm).toBe('catmull-clark');
    });

    it('should merge provided params with defaults', () => {
      const { addModifier } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision', {
        levels: 3,
      });

      expect(modifier.params.levels).toBe(3);
      expect(modifier.params.subdivisionAlgorithm).toBe('catmull-clark');
    });

    it('should generate unique IDs for modifiers', () => {
      const { addModifier } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'subdivision');

      expect(mod1.id).not.toBe(mod2.id);
    });
  });

  describe('removeModifier', () => {
    it('should remove a modifier', () => {
      const { addModifier, removeModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision');
      expect(getModifiers(objectId)).toHaveLength(1);

      removeModifier(objectId, modifier.id);
      expect(getModifiers(objectId)).toHaveLength(0);
    });

    it('should remove specific modifier from multiple', () => {
      const { addModifier, removeModifier, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');
      const mod3 = addModifier(objectId, 'array');

      removeModifier(objectId, mod2.id);

      const modifiers = getModifiers(objectId);
      expect(modifiers).toHaveLength(2);
      expect(modifiers.find(m => m.id === mod1.id)).toBeDefined();
      expect(modifiers.find(m => m.id === mod3.id)).toBeDefined();
      expect(modifiers.find(m => m.id === mod2.id)).toBeUndefined();
    });

    it('should handle removing non-existent modifier', () => {
      const { addModifier, removeModifier, getModifiers } = useModifierStore.getState();

      addModifier(objectId, 'subdivision');

      removeModifier(objectId, 'non-existent-id');
      expect(getModifiers(objectId)).toHaveLength(1);
    });
  });

  describe('updateModifier', () => {
    it('should update modifier parameters', () => {
      const { addModifier, updateModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision');

      updateModifier(objectId, modifier.id, {
        params: { levels: 3 },
      });

      const updated = getModifiers(objectId)[0];
      expect(updated.params.levels).toBe(3);
    });

    it('should update modifier name', () => {
      const { addModifier, updateModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision');

      updateModifier(objectId, modifier.id, {
        name: 'Custom Subdivision',
      });

      const updated = getModifiers(objectId)[0];
      expect(updated.name).toBe('Custom Subdivision');
    });

    it('should preserve other properties when updating', () => {
      const { addModifier, updateModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision');
      const originalId = modifier.id;
      const originalType = modifier.type;

      updateModifier(objectId, modifier.id, {
        name: 'Updated',
      });

      const updated = getModifiers(objectId)[0];
      expect(updated.id).toBe(originalId);
      expect(updated.type).toBe(originalType);
    });
  });

  describe('toggleModifier', () => {
    it('should toggle modifier enabled state', () => {
      const { addModifier, toggleModifier, getModifiers } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'subdivision');
      expect(modifier.enabled).toBe(true);

      toggleModifier(objectId, modifier.id);
      expect(getModifiers(objectId)[0].enabled).toBe(false);

      toggleModifier(objectId, modifier.id);
      expect(getModifiers(objectId)[0].enabled).toBe(true);
    });

    it('should only toggle specific modifier', () => {
      const { addModifier, toggleModifier, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');

      toggleModifier(objectId, mod1.id);

      const modifiers = getModifiers(objectId);
      expect(modifiers[0].enabled).toBe(false);
      expect(modifiers[1].enabled).toBe(true);
    });
  });

  describe('reordering', () => {
    it('should move modifier up', () => {
      const { addModifier, moveModifierUp, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');
      const mod3 = addModifier(objectId, 'array');

      moveModifierUp(objectId, mod3.id);

      const modifiers = getModifiers(objectId);
      expect(modifiers[0].id).toBe(mod1.id);
      expect(modifiers[1].id).toBe(mod3.id);
      expect(modifiers[2].id).toBe(mod2.id);
    });

    it('should not move first modifier up', () => {
      const { addModifier, moveModifierUp, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');

      moveModifierUp(objectId, mod1.id);

      const modifiers = getModifiers(objectId);
      expect(modifiers[0].id).toBe(mod1.id);
      expect(modifiers[1].id).toBe(mod2.id);
    });

    it('should move modifier down', () => {
      const { addModifier, moveModifierDown, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');
      const mod3 = addModifier(objectId, 'array');

      moveModifierDown(objectId, mod1.id);

      const modifiers = getModifiers(objectId);
      expect(modifiers[0].id).toBe(mod2.id);
      expect(modifiers[1].id).toBe(mod1.id);
      expect(modifiers[2].id).toBe(mod3.id);
    });

    it('should not move last modifier down', () => {
      const { addModifier, moveModifierDown, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');

      moveModifierDown(objectId, mod2.id);

      const modifiers = getModifiers(objectId);
      expect(modifiers[0].id).toBe(mod1.id);
      expect(modifiers[1].id).toBe(mod2.id);
    });

    it('should reorder modifiers by index', () => {
      const { addModifier, reorderModifiers, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');
      const mod3 = addModifier(objectId, 'array');

      reorderModifiers(objectId, 0, 2); // Move first to last

      const modifiers = getModifiers(objectId);
      expect(modifiers[0].id).toBe(mod2.id);
      expect(modifiers[1].id).toBe(mod3.id);
      expect(modifiers[2].id).toBe(mod1.id);
    });

    it('should handle invalid reorder indices', () => {
      const { addModifier, reorderModifiers, getModifiers } = useModifierStore.getState();

      const mod1 = addModifier(objectId, 'subdivision');
      const mod2 = addModifier(objectId, 'mirror');

      reorderModifiers(objectId, 5, 0); // Invalid from index
      reorderModifiers(objectId, 0, 10); // Invalid to index

      const modifiers = getModifiers(objectId);
      expect(modifiers[0].id).toBe(mod1.id);
      expect(modifiers[1].id).toBe(mod2.id);
    });
  });

  describe('clearModifiers', () => {
    it('should clear all modifiers for an object', () => {
      const { addModifier, clearModifiers, getModifiers } = useModifierStore.getState();

      addModifier(objectId, 'subdivision');
      addModifier(objectId, 'mirror');
      addModifier(objectId, 'array');

      expect(getModifiers(objectId)).toHaveLength(3);

      clearModifiers(objectId);

      expect(getModifiers(objectId)).toHaveLength(0);
    });

    it('should not affect other objects', () => {
      const { addModifier, clearModifiers, getModifiers } = useModifierStore.getState();

      const otherObjectId = 'test-object-2';

      addModifier(objectId, 'subdivision');
      addModifier(otherObjectId, 'mirror');

      clearModifiers(objectId);

      expect(getModifiers(objectId)).toHaveLength(0);
      expect(getModifiers(otherObjectId)).toHaveLength(1);
    });
  });

  describe('applyModifierStack', () => {
    it('should apply subdivision modifier', () => {
      const { addModifier, applyModifierStack } = useModifierStore.getState();

      addModifier(objectId, 'subdivision', { levels: 2 });

      const result = applyModifierStack(objectId, geometry);

      expect(result).toBeInstanceOf(THREE.BufferGeometry);
      expect(result).not.toBe(geometry); // Should be a new geometry
    });

    it('should apply mirror modifier', () => {
      const { addModifier, applyModifierStack } = useModifierStore.getState();

      addModifier(objectId, 'mirror', { mirrorAxis: 'x' });

      const originalVertexCount = geometry.attributes.position.count;
      const result = applyModifierStack(objectId, geometry);

      // Mirror should double vertex count
      expect(result.attributes.position.count).toBe(originalVertexCount * 2);
    });

    it('should apply array modifier', () => {
      const { addModifier, applyModifierStack } = useModifierStore.getState();

      addModifier(objectId, 'array', { arrayCount: 3 });

      const originalVertexCount = geometry.attributes.position.count;
      const result = applyModifierStack(objectId, geometry);

      // Array should triple vertex count
      expect(result.attributes.position.count).toBe(originalVertexCount * 3);
    });

    it('should apply modifiers in order', () => {
      const { addModifier, applyModifierStack } = useModifierStore.getState();

      // Add modifiers in specific order
      addModifier(objectId, 'mirror', { mirrorAxis: 'x' });
      addModifier(objectId, 'array', { arrayCount: 2 });

      const originalVertexCount = geometry.attributes.position.count;
      const result = applyModifierStack(objectId, geometry);

      // Mirror doubles, then array doubles → 4x vertices
      expect(result.attributes.position.count).toBe(originalVertexCount * 4);
    });

    it('should skip disabled modifiers', () => {
      const { addModifier, toggleModifier, applyModifierStack } = useModifierStore.getState();

      const modifier = addModifier(objectId, 'mirror');
      toggleModifier(objectId, modifier.id); // Disable it

      const originalVertexCount = geometry.attributes.position.count;
      const result = applyModifierStack(objectId, geometry);

      // Mirror is disabled, so vertex count should not change
      expect(result.attributes.position.count).toBe(originalVertexCount);
    });

    it('should handle empty modifier stack', () => {
      const { applyModifierStack } = useModifierStore.getState();

      const result = applyModifierStack(objectId, geometry);

      // Should return a clone of the original
      expect(result).not.toBe(geometry);
      expect(result.attributes.position.count).toBe(geometry.attributes.position.count);
    });

    it('should handle solidify modifier', () => {
      const { addModifier, applyModifierStack } = useModifierStore.getState();

      addModifier(objectId, 'solidify', { thickness: 0.2 });

      const result = applyModifierStack(objectId, geometry);

      expect(result).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.attributes.position).toBeDefined();
    });

    it('should handle displace modifier', () => {
      const { addModifier, applyModifierStack } = useModifierStore.getState();

      addModifier(objectId, 'displace', { displaceStrength: 0.5 });

      const result = applyModifierStack(objectId, geometry);

      expect(result).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.attributes.position).toBeDefined();
    });

    it('should maintain geometry validity after modifiers', () => {
      const { addModifier, applyModifierStack } = useModifierStore.getState();

      addModifier(objectId, 'subdivision');
      addModifier(objectId, 'mirror');

      const result = applyModifierStack(objectId, geometry);

      // Check geometry validity
      expect(result.attributes.position).toBeDefined();
      expect(result.attributes.normal).toBeDefined();
      expect(result.index).toBeDefined();
      expect(result.boundingBox).toBeDefined();
    });
  });

  describe('multiple objects', () => {
    it('should manage modifiers for multiple objects independently', () => {
      const { addModifier, getModifiers } = useModifierStore.getState();

      const obj1 = 'object-1';
      const obj2 = 'object-2';

      addModifier(obj1, 'subdivision');
      addModifier(obj1, 'mirror');

      addModifier(obj2, 'array');

      expect(getModifiers(obj1)).toHaveLength(2);
      expect(getModifiers(obj2)).toHaveLength(1);
    });

    it('should not share modifiers between objects', () => {
      const { addModifier, removeModifier, getModifiers } = useModifierStore.getState();

      const obj1 = 'object-1';
      const obj2 = 'object-2';

      const mod1 = addModifier(obj1, 'subdivision');
      addModifier(obj2, 'mirror');

      removeModifier(obj1, mod1.id);

      expect(getModifiers(obj1)).toHaveLength(0);
      expect(getModifiers(obj2)).toHaveLength(1);
    });
  });
});
