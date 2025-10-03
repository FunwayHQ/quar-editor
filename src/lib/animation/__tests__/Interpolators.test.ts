/**
 * Interpolators Unit Tests
 * Sprint 6: Animation System & Timeline
 */

import { describe, it, expect } from 'vitest';
import {
  lerp,
  lerpVector3,
  stepInterpolate,
  lerpColor,
  interpolate,
  getValueAtTime,
} from '../Interpolators';

describe('Interpolators', () => {
  describe('lerp (Linear Interpolation)', () => {
    it('should interpolate between two numbers', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('should handle negative numbers', () => {
      expect(lerp(-5, 5, 0.5)).toBe(0);
      expect(lerp(-10, -5, 0.5)).toBe(-7.5);
    });

    it('should allow t values outside 0-1', () => {
      expect(lerp(0, 10, 1.5)).toBe(15);
      expect(lerp(0, 10, -0.5)).toBe(-5);
    });
  });

  describe('lerpVector3', () => {
    it('should interpolate Vector3 arrays', () => {
      const result = lerpVector3([0, 0, 0], [10, 20, 30], 0.5);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should handle t=0 (start)', () => {
      const result = lerpVector3([1, 2, 3], [4, 5, 6], 0);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle t=1 (end)', () => {
      const result = lerpVector3([1, 2, 3], [4, 5, 6], 1);
      expect(result).toEqual([4, 5, 6]);
    });

    it('should interpolate each component independently', () => {
      const result = lerpVector3([0, 10, 20], [10, 20, 40], 0.5);
      expect(result).toEqual([5, 15, 30]);
    });
  });

  describe('stepInterpolate', () => {
    it('should return start value when t < 1', () => {
      expect(stepInterpolate(5, 10, 0)).toBe(5);
      expect(stepInterpolate(5, 10, 0.5)).toBe(5);
      expect(stepInterpolate(5, 10, 0.99)).toBe(5);
    });

    it('should return end value when t >= 1', () => {
      expect(stepInterpolate(5, 10, 1)).toBe(10);
      expect(stepInterpolate(5, 10, 1.5)).toBe(10);
    });
  });

  describe('lerpColor', () => {
    it('should interpolate between two hex colors', () => {
      const result = lerpColor('#000000', '#FFFFFF', 0.5);
      // Three.js uses linear RGB interpolation (not sRGB)
      expect(result.toLowerCase()).toBe('#bcbcbc');
    });

    it('should return start color at t=0', () => {
      const result = lerpColor('#FF0000', '#00FF00', 0);
      expect(result).toBe('#FF0000');
    });

    it('should return end color at t=1', () => {
      const result = lerpColor('#FF0000', '#00FF00', 1);
      expect(result).toBe('#00FF00');
    });

    it('should handle colors with different formats', () => {
      const result = lerpColor('#f00', '#0f0', 0.5);
      // Should interpolate between red and green
      expect(result.length).toBe(7); // #RRGGBB format
      expect(result.startsWith('#')).toBe(true);
    });
  });

  describe('interpolate (Generic Dispatcher)', () => {
    it('should interpolate numbers with linear mode', () => {
      const result = interpolate(0, 10, 0.5, 'linear');
      expect(result).toBe(5);
    });

    it('should interpolate numbers with step mode', () => {
      expect(interpolate(5, 10, 0.5, 'step')).toBe(5);
      expect(interpolate(5, 10, 1, 'step')).toBe(10);
    });

    it('should interpolate Vector3', () => {
      const result = interpolate([0, 0, 0], [10, 20, 30], 0.5, 'linear');
      expect(result).toEqual([5, 10, 15]);
    });

    it('should interpolate Vector3 with step', () => {
      const result1 = interpolate([1, 2, 3], [4, 5, 6], 0.5, 'step');
      expect(result1).toEqual([1, 2, 3]);

      const result2 = interpolate([1, 2, 3], [4, 5, 6], 1, 'step');
      expect(result2).toEqual([4, 5, 6]);
    });

    it('should interpolate hex colors', () => {
      const result = interpolate('#000000', '#FFFFFF', 0.5, 'linear');
      expect(result.toLowerCase()).toBe('#bcbcbc');
    });

    it('should handle booleans (always step)', () => {
      expect(interpolate(false, true, 0.5)).toBe(false);
      expect(interpolate(false, true, 1)).toBe(true);
    });

    it('should handle null/undefined', () => {
      expect(interpolate(null, 5, 0.5, 'step')).toBe(null);
      expect(interpolate(null, 5, 1, 'step')).toBe(5);
    });
  });

  describe('getValueAtTime', () => {
    it('should return null for empty keyframes', () => {
      const result = getValueAtTime([], 1.0);
      expect(result).toBeNull();
    });

    it('should return single keyframe value', () => {
      const keyframes = [
        { time: 1.0, value: 5, interpolation: 'linear' as const },
      ];
      const result = getValueAtTime(keyframes, 2.0);
      expect(result).toBe(5);
    });

    it('should return first keyframe before start', () => {
      const keyframes = [
        { time: 1.0, value: 5, interpolation: 'linear' as const },
        { time: 2.0, value: 10, interpolation: 'linear' as const },
      ];
      const result = getValueAtTime(keyframes, 0.5);
      expect(result).toBe(5);
    });

    it('should return last keyframe after end', () => {
      const keyframes = [
        { time: 1.0, value: 5, interpolation: 'linear' as const },
        { time: 2.0, value: 10, interpolation: 'linear' as const },
      ];
      const result = getValueAtTime(keyframes, 3.0);
      expect(result).toBe(10);
    });

    it('should interpolate between keyframes', () => {
      const keyframes = [
        { time: 0, value: 0, interpolation: 'linear' as const },
        { time: 2, value: 10, interpolation: 'linear' as const },
      ];
      const result = getValueAtTime(keyframes, 1.0);
      expect(result).toBe(5);
    });

    it('should use correct interpolation mode from keyframe', () => {
      const keyframes = [
        { time: 0, value: 5, interpolation: 'step' as const },
        { time: 2, value: 10, interpolation: 'step' as const },
      ];
      const result = getValueAtTime(keyframes, 1.0);
      expect(result).toBe(5); // Step interpolation
    });

    it('should interpolate Vector3 values', () => {
      const keyframes = [
        { time: 0, value: [0, 0, 0], interpolation: 'linear' as const },
        { time: 2, value: [10, 20, 30], interpolation: 'linear' as const },
      ];
      const result = getValueAtTime(keyframes, 1.0);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should interpolate colors', () => {
      const keyframes = [
        { time: 0, value: '#000000', interpolation: 'linear' as const },
        { time: 2, value: '#FFFFFF', interpolation: 'linear' as const },
      ];
      const result = getValueAtTime(keyframes, 1.0);
      expect(result.toLowerCase()).toBe('#bcbcbc');
    });

    it('should handle multiple keyframes', () => {
      const keyframes = [
        { time: 0, value: 0, interpolation: 'linear' as const },
        { time: 1, value: 5, interpolation: 'linear' as const },
        { time: 2, value: 10, interpolation: 'linear' as const },
        { time: 3, value: 15, interpolation: 'linear' as const },
      ];

      expect(getValueAtTime(keyframes, 0.5)).toBe(2.5);
      expect(getValueAtTime(keyframes, 1.5)).toBe(7.5);
      expect(getValueAtTime(keyframes, 2.5)).toBe(12.5);
    });
  });
});
