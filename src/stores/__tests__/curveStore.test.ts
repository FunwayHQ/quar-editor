/**
 * Curve Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCurveStore, Curve } from '../curveStore';
import * as THREE from 'three';

describe('curveStore', () => {
  beforeEach(() => {
    // Clear store before each test
    useCurveStore.getState().clear();
  });

  const createMockCurve = (id: string = 'curve1', name: string = 'Test Curve'): Curve => ({
    id,
    name,
    type: 'svg',
    points: [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(10, 10),
      new THREE.Vector2(20, 0)
    ],
    closed: true,
    svgPath: 'M 0 0 L 10 10 L 20 0 Z',
    transform: {
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector2(1, 1)
    },
    createdAt: Date.now(),
    modifiedAt: Date.now()
  });

  describe('addCurve()', () => {
    it('should add a curve to the store', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);

      const curves = useCurveStore.getState().curves;
      expect(curves.size).toBe(1);
      expect(curves.get('curve1')).toEqual(curve);
    });

    it('should add multiple curves', () => {
      const curve1 = createMockCurve('curve1');
      const curve2 = createMockCurve('curve2');

      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);

      const curves = useCurveStore.getState().curves;
      expect(curves.size).toBe(2);
    });

    it('should replace existing curve with same ID', () => {
      const curve1 = createMockCurve('curve1', 'First');
      const curve2 = createMockCurve('curve1', 'Second');

      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);

      const curves = useCurveStore.getState().curves;
      expect(curves.size).toBe(1);
      expect(curves.get('curve1')?.name).toBe('Second');
    });
  });

  describe('removeCurve()', () => {
    it('should remove a curve from the store', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);
      useCurveStore.getState().removeCurve('curve1');

      const curves = useCurveStore.getState().curves;
      expect(curves.size).toBe(0);
    });

    it('should remove curve from selection when deleted', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);
      useCurveStore.getState().selectCurve('curve1');
      useCurveStore.getState().removeCurve('curve1');

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toHaveLength(0);
    });

    it('should handle removing non-existent curve', () => {
      useCurveStore.getState().removeCurve('nonexistent');

      const curves = useCurveStore.getState().curves;
      expect(curves.size).toBe(0);
    });
  });

  describe('updateCurve()', () => {
    it('should update curve properties', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);

      useCurveStore.getState().updateCurve('curve1', { name: 'Updated Name' });

      const updated = useCurveStore.getState().curves.get('curve1');
      expect(updated?.name).toBe('Updated Name');
    });

    it('should update modifiedAt timestamp', () => {
      // Use fake timers to control time
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const curve = createMockCurve();
      const originalTime = curve.modifiedAt;
      useCurveStore.getState().addCurve(curve);

      // Advance time by 100ms
      vi.advanceTimersByTime(100);

      useCurveStore.getState().updateCurve('curve1', { name: 'Updated' });

      const updated = useCurveStore.getState().curves.get('curve1');
      expect(updated?.modifiedAt).toBeGreaterThan(originalTime);

      // Restore real timers
      vi.useRealTimers();
    });

    it('should handle updating non-existent curve', () => {
      useCurveStore.getState().updateCurve('nonexistent', { name: 'Test' });

      const curves = useCurveStore.getState().curves;
      expect(curves.size).toBe(0);
    });
  });

  describe('getCurve()', () => {
    it('should retrieve a curve by ID', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);

      const retrieved = useCurveStore.getState().getCurve('curve1');
      expect(retrieved).toEqual(curve);
    });

    it('should return undefined for non-existent curve', () => {
      const retrieved = useCurveStore.getState().getCurve('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('selectCurve()', () => {
    it('should select a curve (single select)', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);

      useCurveStore.getState().selectCurve('curve1');

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toEqual(['curve1']);
    });

    it('should replace selection in single select mode', () => {
      const curve1 = createMockCurve('curve1');
      const curve2 = createMockCurve('curve2');
      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);

      useCurveStore.getState().selectCurve('curve1');
      useCurveStore.getState().selectCurve('curve2');

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toEqual(['curve2']);
    });

    it('should add to selection in multi-select mode', () => {
      const curve1 = createMockCurve('curve1');
      const curve2 = createMockCurve('curve2');
      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);

      useCurveStore.getState().selectCurve('curve1');
      useCurveStore.getState().selectCurve('curve2', true);

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toEqual(['curve1', 'curve2']);
    });

    it('should not select non-existent curve', () => {
      useCurveStore.getState().selectCurve('nonexistent');

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toHaveLength(0);
    });

    it('should not duplicate selection in multi-select', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);

      useCurveStore.getState().selectCurve('curve1');
      useCurveStore.getState().selectCurve('curve1', true);

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toEqual(['curve1']);
    });
  });

  describe('clearSelection()', () => {
    it('should clear all selected curves', () => {
      const curve1 = createMockCurve('curve1');
      const curve2 = createMockCurve('curve2');
      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);

      useCurveStore.getState().selectCurve('curve1');
      useCurveStore.getState().selectCurve('curve2', true);
      useCurveStore.getState().clearSelection();

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toHaveLength(0);
    });
  });

  describe('toggleCurveSelection()', () => {
    it('should toggle selection in single select mode', () => {
      const curve = createMockCurve();
      useCurveStore.getState().addCurve(curve);

      useCurveStore.getState().toggleCurveSelection('curve1');
      expect(useCurveStore.getState().selectedCurveIds).toEqual(['curve1']);

      useCurveStore.getState().toggleCurveSelection('curve1');
      expect(useCurveStore.getState().selectedCurveIds).toHaveLength(0);
    });

    it('should toggle in multi-select mode', () => {
      const curve1 = createMockCurve('curve1');
      const curve2 = createMockCurve('curve2');
      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);

      useCurveStore.getState().toggleCurveSelection('curve1', true);
      useCurveStore.getState().toggleCurveSelection('curve2', true);
      expect(useCurveStore.getState().selectedCurveIds).toHaveLength(2);

      useCurveStore.getState().toggleCurveSelection('curve1', true);
      expect(useCurveStore.getState().selectedCurveIds).toEqual(['curve2']);
    });

    it('should not toggle non-existent curve', () => {
      useCurveStore.getState().toggleCurveSelection('nonexistent');

      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(selectedIds).toHaveLength(0);
    });
  });

  describe('generateName()', () => {
    it('should generate unique names based on type', () => {
      const name1 = useCurveStore.getState().generateName('svg');
      expect(name1).toBe('svg_1');

      const curve = createMockCurve('curve1', 'svg_1');
      useCurveStore.getState().addCurve(curve);

      const name2 = useCurveStore.getState().generateName('svg');
      expect(name2).toBe('svg_2');
    });

    it('should count existing curves with same type', () => {
      const curve1 = createMockCurve('curve1', 'circle_1');
      const curve2 = createMockCurve('curve2', 'circle_2');
      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);

      const name = useCurveStore.getState().generateName('circle');
      expect(name).toBe('circle_3');
    });
  });

  describe('clear()', () => {
    it('should clear all curves and selection', () => {
      const curve1 = createMockCurve('curve1');
      const curve2 = createMockCurve('curve2');
      useCurveStore.getState().addCurve(curve1);
      useCurveStore.getState().addCurve(curve2);
      useCurveStore.getState().selectCurve('curve1');

      useCurveStore.getState().clear();

      const curves = useCurveStore.getState().curves;
      const selectedIds = useCurveStore.getState().selectedCurveIds;
      expect(curves.size).toBe(0);
      expect(selectedIds).toHaveLength(0);
    });
  });
});
