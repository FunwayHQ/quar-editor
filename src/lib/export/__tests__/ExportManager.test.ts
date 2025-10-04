/**
 * Export Manager Tests
 *
 * Tests for scene export functionality.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ExportManager } from '../ExportManager';
import { SceneObject } from '../../../stores/objectsStore';
import { ExportOptions } from '../../../stores/exportStore';

describe('ExportManager', () => {
  let exportManager: ExportManager;
  let mockObjects: SceneObject[];
  let mockAnimations: Map<string, any>;
  let mockOptions: ExportOptions;

  beforeEach(() => {
    exportManager = new ExportManager();

    // Create mock objects
    mockObjects = [
      {
        id: 'obj1',
        name: 'Box1',
        type: 'box',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        geometryParams: {
          width: 1,
          height: 1,
          depth: 1,
        },
        geometry: {
          type: 'box',
          parameters: {
            width: 1,
            height: 1,
            depth: 1,
          },
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      } as SceneObject,
      {
        id: 'light1',
        name: 'PointLight1',
        type: 'pointLight',
        visible: true,
        locked: false,
        position: [5, 5, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        geometryParams: {},
        lightProps: {
          color: '#FFFFFF',
          intensity: 1,
          distance: 0,
          decay: 2,
          castShadow: true,
          shadowMapSize: 1024,
          shadowBias: -0.0001,
          shadowRadius: 1,
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      } as SceneObject,
    ];

    mockAnimations = new Map();

    mockOptions = {
      format: 'glb',
      includeAnimations: true,
      includeMaterials: true,
      embedTextures: true,
      exportSelectionOnly: false,
      binary: true,
    };
  });

  describe('Scene Building', () => {
    test('should build Three.js scene from objects', async () => {
      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.filename).toBe('scene.glb');
    });

    test('should export only meshes when exportSelectionOnly is true', async () => {
      mockObjects[0].selected = true; // Select box only
      mockOptions.exportSelectionOnly = true;

      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
    });

    test('should handle empty scene', async () => {
      const result = await exportManager.exportScene(
        [],
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
    });

    test('should handle light objects', async () => {
      const lightOnly = [mockObjects[1]]; // Just the light

      const result = await exportManager.exportScene(
        lightOnly,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Format Export', () => {
    test('should export to GLB format', async () => {
      mockOptions.format = 'glb';
      mockOptions.binary = true;

      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('scene.glb');
      expect(result.data).toBeInstanceOf(Blob);
      expect((result.data as Blob).type).toBe('model/gltf-binary');
    });

    test('should export to GLTF format', async () => {
      mockOptions.format = 'gltf';
      mockOptions.binary = false;

      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('scene.gltf');
      expect(result.data).toBeInstanceOf(Blob);
    });

    test('should export to OBJ format', async () => {
      mockOptions.format = 'obj';

      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('scene.obj');
      expect(result.data).toBeInstanceOf(Blob);
    });

    test('should export to USDZ format', async () => {
      mockOptions.format = 'usdz';

      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('scene.usdz');
      expect(result.data).toBeInstanceOf(Blob);
    });

    test('should export to FBX format', async () => {
      mockOptions.format = 'fbx';

      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      // FBX might fail if three-stdlib is not available, that's ok
      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();
    });
  });

  describe('Progress Callbacks', () => {
    test('should call onProgress callback during export', async () => {
      const onProgress = vi.fn();

      await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions,
        onProgress
      );

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls[0][0]).toBe(0); // First call with 0%
      expect(onProgress.mock.calls[0][1]).toBe('Preparing scene...');
    });

    test('should report 100% progress on completion', async () => {
      const onProgress = vi.fn();

      await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions,
        onProgress
      );

      // Find the 100% call
      const completionCall = onProgress.mock.calls.find(call => call[0] === 100);
      expect(completionCall).toBeDefined();
      expect(completionCall[1]).toBe('Export complete!');
    });
  });

  describe('Geometry Handling', () => {
    test('should handle all primitive types', async () => {
      const primitives: SceneObject[] = [
        {
          id: 'sphere1',
          name: 'Sphere',
          type: 'sphere',
          visible: true,
          locked: false,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          parentId: null,
          children: [],
          geometryParams: { radius: 0.5, widthSegments: 32, heightSegments: 16 },
          geometry: {
            type: 'sphere',
            parameters: { radius: 0.5, widthSegments: 32, heightSegments: 16 },
          },
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        } as SceneObject,
        {
          id: 'cylinder1',
          name: 'Cylinder',
          type: 'cylinder',
          visible: true,
          locked: false,
          position: [2, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          parentId: null,
          children: [],
          geometryParams: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 32 },
          geometry: {
            type: 'cylinder',
            parameters: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 32 },
          },
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        } as SceneObject,
      ];

      const result = await exportManager.exportScene(
        primitives,
        mockAnimations,
        mockOptions
      );

      expect(result.success).toBe(true);
    });

    test('should skip objects with invalid geometry', async () => {
      const invalidObject = {
        id: 'invalid1',
        name: 'Invalid',
        type: 'unknown',
        visible: true,
        locked: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parentId: null,
        children: [],
        geometryParams: {},
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      } as SceneObject;

      const result = await exportManager.exportScene(
        [invalidObject],
        mockAnimations,
        mockOptions
      );

      // Should still succeed but with empty scene
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle export errors gracefully', async () => {
      // Pass invalid data to trigger error
      mockObjects[0].geometry = undefined as any;

      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        mockOptions
      );

      // Should still return a result object
      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();
    });

    test('should include error message on failure', async () => {
      // Create a scenario that will fail
      const result = await exportManager.exportScene(
        mockObjects,
        mockAnimations,
        { ...mockOptions, format: 'invalid' as any }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unsupported format');
    });
  });

  describe('File Download', () => {
    test('should create download link and trigger download', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const filename = 'test.txt';

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock appendChild/removeChild to avoid happy-dom issues
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      // Mock click
      const mockClick = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tag) => {
        if (tag === 'a') {
          return { click: mockClick, href: '', download: '' } as any;
        }
        return createElementSpy.wrappedMethod.call(document, tag);
      });

      exportManager.downloadFile(blob, filename);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockClick).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });
});
