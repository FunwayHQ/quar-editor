/**
 * Export Store Tests
 *
 * Tests for export state management.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { useExportStore } from '../exportStore';

describe('ExportStore', () => {
  beforeEach(() => {
    // Reset store
    useExportStore.setState({
      options: {
        format: 'glb',
        includeAnimations: true,
        includeMaterials: true,
        embedTextures: true,
        exportSelectionOnly: false,
        binary: true,
      },
      progress: {
        isExporting: false,
        progress: 0,
        currentStep: '',
        error: null,
      },
    });
  });

  describe('Format Selection', () => {
    test('should set format to gltf', () => {
      useExportStore.getState().setFormat('gltf');
      expect(useExportStore.getState().options.format).toBe('gltf');
    });

    test('should set format to fbx', () => {
      useExportStore.getState().setFormat('fbx');
      expect(useExportStore.getState().options.format).toBe('fbx');
    });

    test('should set format to obj', () => {
      useExportStore.getState().setFormat('obj');
      expect(useExportStore.getState().options.format).toBe('obj');
    });

    test('should set format to usdz', () => {
      useExportStore.getState().setFormat('usdz');
      expect(useExportStore.getState().options.format).toBe('usdz');
    });

    test('should auto-set binary to true for glb', () => {
      useExportStore.getState().setFormat('glb');
      expect(useExportStore.getState().options.binary).toBe(true);
    });

    test('should auto-set binary to false for gltf', () => {
      useExportStore.getState().setFormat('gltf');
      expect(useExportStore.getState().options.binary).toBe(false);
    });
  });

  describe('Export Options', () => {
    test('should toggle includeAnimations', () => {
      useExportStore.getState().setOption('includeAnimations', false);
      expect(useExportStore.getState().options.includeAnimations).toBe(false);

      useExportStore.getState().setOption('includeAnimations', true);
      expect(useExportStore.getState().options.includeAnimations).toBe(true);
    });

    test('should toggle includeMaterials', () => {
      useExportStore.getState().setOption('includeMaterials', false);
      expect(useExportStore.getState().options.includeMaterials).toBe(false);
    });

    test('should toggle embedTextures', () => {
      useExportStore.getState().setOption('embedTextures', false);
      expect(useExportStore.getState().options.embedTextures).toBe(false);
    });

    test('should toggle exportSelectionOnly', () => {
      useExportStore.getState().setOption('exportSelectionOnly', true);
      expect(useExportStore.getState().options.exportSelectionOnly).toBe(true);
    });

    test('should set multiple options at once', () => {
      useExportStore.getState().setOptions({
        includeAnimations: false,
        includeMaterials: false,
        embedTextures: false,
      });

      const options = useExportStore.getState().options;
      expect(options.includeAnimations).toBe(false);
      expect(options.includeMaterials).toBe(false);
      expect(options.embedTextures).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    test('should start export with initial progress', () => {
      useExportStore.getState().startExport();

      const progress = useExportStore.getState().progress;
      expect(progress.isExporting).toBe(true);
      expect(progress.progress).toBe(0);
      expect(progress.currentStep).toBe('Initializing export...');
      expect(progress.error).toBeNull();
    });

    test('should update progress', () => {
      useExportStore.getState().startExport();
      useExportStore.getState().updateProgress(50, 'Converting to GLTF...');

      const progress = useExportStore.getState().progress;
      expect(progress.progress).toBe(50);
      expect(progress.currentStep).toBe('Converting to GLTF...');
    });

    test('should complete export', () => {
      useExportStore.getState().startExport();
      useExportStore.getState().updateProgress(90, 'Finishing...');
      useExportStore.getState().completeExport();

      const progress = useExportStore.getState().progress;
      expect(progress.isExporting).toBe(false);
      expect(progress.progress).toBe(100);
      expect(progress.currentStep).toBe('Export complete!');
      expect(progress.error).toBeNull();
    });

    test('should fail export with error', () => {
      useExportStore.getState().startExport();
      useExportStore.getState().failExport('Export failed: invalid geometry');

      const progress = useExportStore.getState().progress;
      expect(progress.isExporting).toBe(false);
      expect(progress.progress).toBe(0);
      expect(progress.error).toBe('Export failed: invalid geometry');
    });

    test('should reset progress', () => {
      useExportStore.getState().startExport();
      useExportStore.getState().updateProgress(75, 'Almost done...');
      useExportStore.getState().resetProgress();

      const progress = useExportStore.getState().progress;
      expect(progress.isExporting).toBe(false);
      expect(progress.progress).toBe(0);
      expect(progress.currentStep).toBe('');
      expect(progress.error).toBeNull();
    });
  });

  describe('Default State', () => {
    test('should have correct default options', () => {
      const options = useExportStore.getState().options;
      expect(options.format).toBe('glb');
      expect(options.includeAnimations).toBe(true);
      expect(options.includeMaterials).toBe(true);
      expect(options.embedTextures).toBe(true);
      expect(options.exportSelectionOnly).toBe(false);
      expect(options.binary).toBe(true);
    });

    test('should have initial progress state', () => {
      const progress = useExportStore.getState().progress;
      expect(progress.isExporting).toBe(false);
      expect(progress.progress).toBe(0);
      expect(progress.currentStep).toBe('');
      expect(progress.error).toBeNull();
    });
  });
});
