/**
 * Scene Serializer Service Tests
 *
 * Tests for the centralized scene serialization/deserialization service.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { serializeScene, deserializeScene } from '../sceneSerializer';
import { useObjectsStore } from '../../stores/objectsStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useMorphTargetStore } from '../../stores/morphTargetStore';
import { useCurveStore } from '../../stores/curveStore';

describe('Scene Serializer', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useObjectsStore.setState({ objects: new Map() });
    useMaterialsStore.setState({
      materials: new Map(),
      textures: new Map(),
      objectMaterials: new Map()
    });
    useAnimationStore.setState({ animations: new Map(), activeAnimationId: null });
    useEnvironmentStore.setState({
      backgroundColor: '#0A0A0B',
      hdriEnabled: false,
      hdriPreset: null,
      hdriIntensity: 1,
      hdriAsBackground: true,
      backgroundBlur: 0,
      fogEnabled: false,
      fogType: 'linear',
      fogColor: '#0A0A0B',
      fogNear: 10,
      fogFar: 50,
      fogDensity: 0.05,
      groundPlaneEnabled: false,
      groundPlaneSize: 20,
      groundPlaneColor: '#27272A',
      groundPlaneReceiveShadow: true,
    });
    useMorphTargetStore.setState({
      shapeKeysByObject: new Map(),
      basePoses: new Map()
    });
    useCurveStore.setState({ curves: new Map() });
  });

  describe('serializeScene', () => {
    test('serializes empty scene correctly', () => {
      const serialized = serializeScene();

      expect(serialized).toHaveProperty('objects');
      expect(serialized).toHaveProperty('materials');
      expect(serialized).toHaveProperty('animations');
      expect(serialized).toHaveProperty('environment');
      expect(serialized).toHaveProperty('shapeKeys');
      expect(serialized).toHaveProperty('basePoses');
      expect(serialized).toHaveProperty('curves');
    });

    test('serializes objects from objectsStore', () => {
      const testObject = {
        id: 'obj_1',
        name: 'Test Object',
        type: 'box' as const,
        visible: true,
        locked: false,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        parentId: null,
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      useObjectsStore.getState().addObject(testObject);

      const serialized = serializeScene();
      expect(serialized.objects).toHaveLength(1);
      expect(serialized.objects[0].id).toBe('obj_1');
    });

    test('serializes materials from materialsStore', () => {
      const testMaterial = {
        id: 'mat_1',
        name: 'Test Material',
        type: 'standard' as const,
        albedo: '#FF0000',
        metallic: 0.5,
        roughness: 0.5,
        emission: '#000000',
        emissionIntensity: 0,
        albedoMap: null,
        normalMap: null,
        roughnessMap: null,
        metallicMap: null,
        emissionMap: null,
        aoMap: null,
        displacementMap: null,
        opacity: 1,
        transparent: false,
        doubleSided: false,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      useMaterialsStore.getState().addMaterial(testMaterial);

      const serialized = serializeScene();
      expect(serialized.materials.materials).toHaveLength(1);
      expect(serialized.materials.materials[0].id).toBe('mat_1');
    });

    test('serializes environment settings', () => {
      useEnvironmentStore.setState({
        backgroundColor: '#FF0000',
        fogEnabled: true,
      });

      const serialized = serializeScene();
      expect(serialized.environment.backgroundColor).toBe('#FF0000');
      expect(serialized.environment.fogEnabled).toBe(true);
    });
  });

  describe('deserializeScene', () => {
    test('handles null sceneData gracefully', () => {
      expect(() => deserializeScene(null)).not.toThrow();
    });

    test('handles undefined sceneData gracefully', () => {
      expect(() => deserializeScene(undefined)).not.toThrow();
    });

    test('deserializes objects correctly', () => {
      const sceneData = {
        objects: [{
          id: 'obj_1',
          name: 'Test Object',
          type: 'box',
          visible: true,
          locked: false,
          position: [1, 2, 3],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          parentId: null,
          children: [],
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        }],
      };

      deserializeScene(sceneData);

      const objects = useObjectsStore.getState().objects;
      expect(objects.size).toBe(1);
      expect(objects.get('obj_1')?.name).toBe('Test Object');
    });

    test('deserializes materials correctly', () => {
      const sceneData = {
        materials: {
          materials: [{
            id: 'mat_1',
            name: 'Test Material',
            type: 'standard',
            albedo: '#00FF00',
            metallic: 0.3,
            roughness: 0.7,
            emission: '#000000',
            emissionIntensity: 0,
            albedoMap: null,
            normalMap: null,
            roughnessMap: null,
            metallicMap: null,
            emissionMap: null,
            aoMap: null,
            displacementMap: null,
            opacity: 1,
            transparent: false,
            doubleSided: false,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
          }],
          objectMaterials: [],
          textures: [],
        },
      };

      deserializeScene(sceneData);

      const materials = useMaterialsStore.getState().materials;
      expect(materials.size).toBe(1);
      expect(materials.get('mat_1')?.albedo).toBe('#00FF00');
    });

    test('deserializes environment correctly', () => {
      const sceneData = {
        environment: {
          backgroundColor: '#0000FF',
          fogEnabled: true,
          fogColor: '#FFFFFF',
        },
      };

      deserializeScene(sceneData);

      const env = useEnvironmentStore.getState();
      expect(env.backgroundColor).toBe('#0000FF');
      expect(env.fogEnabled).toBe(true);
      expect(env.fogColor).toBe('#FFFFFF');
    });
  });

  describe('round-trip serialization', () => {
    test('serializes and deserializes consistently', () => {
      // Setup initial state
      const testObject = {
        id: 'obj_1',
        name: 'Test Object',
        type: 'sphere' as const,
        visible: true,
        locked: false,
        position: [5, 10, 15] as [number, number, number],
        rotation: [0, Math.PI / 4, 0] as [number, number, number],
        scale: [2, 2, 2] as [number, number, number],
        parentId: null,
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      useObjectsStore.getState().addObject(testObject);

      // Serialize
      const serialized = serializeScene();

      // Reset stores
      useObjectsStore.setState({ objects: new Map() });

      // Deserialize
      deserializeScene(serialized);

      // Verify
      const objects = useObjectsStore.getState().objects;
      expect(objects.size).toBe(1);
      const deserializedObject = objects.get('obj_1');
      expect(deserializedObject?.name).toBe('Test Object');
      expect(deserializedObject?.position).toEqual([5, 10, 15]);
      expect(deserializedObject?.type).toBe('sphere');
    });
  });
});
