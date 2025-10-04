/**
 * Knife Tool Store Tests
 *
 * Comprehensive tests for knife tool state management
 * Mini-Sprint: Knife Tool Implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { useKnifeToolStore } from '../knifeToolStore';

describe('KnifeToolStore', () => {
  beforeEach(() => {
    // Reset store
    useKnifeToolStore.setState({
      isActive: false,
      isDrawing: false,
      drawingPath: [],
      intersectionPoints: [],
    });
  });

  describe('Tool Activation', () => {
    it('should activate knife tool', () => {
      const { activateTool } = useKnifeToolStore.getState();

      activateTool();

      const state = useKnifeToolStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.drawingPath).toEqual([]);
      expect(state.intersectionPoints).toEqual([]);
    });

    it('should deactivate knife tool', () => {
      const { activateTool, deactivateTool } = useKnifeToolStore.getState();

      activateTool();
      deactivateTool();

      const state = useKnifeToolStore.getState();
      expect(state.isActive).toBe(false);
    });

    it('should clear path when deactivating', () => {
      const { activateTool, addPathPoint, deactivateTool } = useKnifeToolStore.getState();

      activateTool();
      addPathPoint(new THREE.Vector3(1, 2, 3));
      deactivateTool();

      expect(useKnifeToolStore.getState().drawingPath).toEqual([]);
    });
  });

  describe('Drawing State', () => {
    it('should start drawing', () => {
      const { startDrawing } = useKnifeToolStore.getState();

      startDrawing();

      expect(useKnifeToolStore.getState().isDrawing).toBe(true);
    });

    it('should stop drawing', () => {
      const { startDrawing, stopDrawing } = useKnifeToolStore.getState();

      startDrawing();
      stopDrawing();

      expect(useKnifeToolStore.getState().isDrawing).toBe(false);
    });
  });

  describe('Path Management', () => {
    it('should add path point', () => {
      const { addPathPoint } = useKnifeToolStore.getState();

      const point = new THREE.Vector3(1, 2, 3);
      addPathPoint(point);

      const path = useKnifeToolStore.getState().drawingPath;
      expect(path).toHaveLength(1);
      expect(path[0].equals(point)).toBe(true);
    });

    it('should clone path points', () => {
      const { addPathPoint } = useKnifeToolStore.getState();

      const point = new THREE.Vector3(1, 2, 3);
      addPathPoint(point);

      // Modify original
      point.x = 999;

      // Stored point should not be affected
      const path = useKnifeToolStore.getState().drawingPath;
      expect(path[0].x).toBe(1);
    });

    it('should add multiple path points', () => {
      const { addPathPoint } = useKnifeToolStore.getState();

      addPathPoint(new THREE.Vector3(0, 0, 0));
      addPathPoint(new THREE.Vector3(1, 0, 0));
      addPathPoint(new THREE.Vector3(2, 0, 0));

      const path = useKnifeToolStore.getState().drawingPath;
      expect(path).toHaveLength(3);
    });

    it('should clear path', () => {
      const { addPathPoint, clearPath } = useKnifeToolStore.getState();

      addPathPoint(new THREE.Vector3(1, 2, 3));
      addPathPoint(new THREE.Vector3(4, 5, 6));

      clearPath();

      const state = useKnifeToolStore.getState();
      expect(state.drawingPath).toEqual([]);
      expect(state.isDrawing).toBe(false);
    });
  });

  describe('Intersection Points', () => {
    it('should set intersection points', () => {
      const { setIntersectionPoints } = useKnifeToolStore.getState();

      const intersections = [
        {
          point: new THREE.Vector3(1, 0, 0),
          faceIndex: 0,
          uv: new THREE.Vector2(0.5, 0.5),
        },
        {
          point: new THREE.Vector3(0, 1, 0),
          faceIndex: 1,
          uv: new THREE.Vector2(0.3, 0.7),
        },
      ];

      setIntersectionPoints(intersections);

      const state = useKnifeToolStore.getState();
      expect(state.intersectionPoints).toHaveLength(2);
      expect(state.intersectionPoints[0].faceIndex).toBe(0);
      expect(state.intersectionPoints[1].faceIndex).toBe(1);
    });

    it('should replace previous intersection points', () => {
      const { setIntersectionPoints } = useKnifeToolStore.getState();

      const ints1 = [
        { point: new THREE.Vector3(1, 0, 0), faceIndex: 0, uv: new THREE.Vector2(0, 0) },
      ];
      const ints2 = [
        { point: new THREE.Vector3(0, 1, 0), faceIndex: 1, uv: new THREE.Vector2(0, 0) },
        { point: new THREE.Vector3(0, 0, 1), faceIndex: 2, uv: new THREE.Vector2(0, 0) },
      ];

      setIntersectionPoints(ints1);
      setIntersectionPoints(ints2);

      expect(useKnifeToolStore.getState().intersectionPoints).toHaveLength(2);
    });
  });

  describe('Confirm and Cancel', () => {
    it('should handle confirm with valid path', () => {
      const { addPathPoint, confirmCut } = useKnifeToolStore.getState();
      const consoleSpy = vi.spyOn(console, 'log');

      addPathPoint(new THREE.Vector3(0, 0, 0));
      addPathPoint(new THREE.Vector3(1, 1, 1));

      confirmCut();

      expect(consoleSpy).toHaveBeenCalledWith('[KnifeTool] Cut confirmed, applying...');
    });

    it('should warn on confirm with insufficient points', () => {
      const { addPathPoint, confirmCut } = useKnifeToolStore.getState();
      const consoleSpy = vi.spyOn(console, 'warn');

      addPathPoint(new THREE.Vector3(0, 0, 0));

      confirmCut();

      expect(consoleSpy).toHaveBeenCalledWith('[KnifeTool] Need at least 2 points to cut');
    });

    it('should cancel cut', () => {
      const { addPathPoint, cancelCut } = useKnifeToolStore.getState();

      addPathPoint(new THREE.Vector3(0, 0, 0));
      addPathPoint(new THREE.Vector3(1, 1, 1));

      cancelCut();

      const state = useKnifeToolStore.getState();
      expect(state.drawingPath).toEqual([]);
      expect(state.intersectionPoints).toEqual([]);
      expect(state.isDrawing).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', () => {
      const {
        activateTool,
        startDrawing,
        addPathPoint,
        setIntersectionPoints,
        stopDrawing,
        confirmCut,
      } = useKnifeToolStore.getState();

      // Activate tool
      activateTool();
      expect(useKnifeToolStore.getState().isActive).toBe(true);

      // Start drawing
      startDrawing();
      expect(useKnifeToolStore.getState().isDrawing).toBe(true);

      // Add points
      addPathPoint(new THREE.Vector3(0, 0, 0));
      addPathPoint(new THREE.Vector3(1, 1, 1));
      expect(useKnifeToolStore.getState().drawingPath).toHaveLength(2);

      // Set intersections
      setIntersectionPoints([
        { point: new THREE.Vector3(0.5, 0.5, 0.5), faceIndex: 0, uv: new THREE.Vector2(0.5, 0.5) },
      ]);

      // Stop drawing
      stopDrawing();
      expect(useKnifeToolStore.getState().isDrawing).toBe(false);

      // Confirm
      confirmCut();
    });
  });
});
