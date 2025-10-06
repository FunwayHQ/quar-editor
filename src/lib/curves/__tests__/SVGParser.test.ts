/**
 * SVGParser Tests
 */

import { describe, it, expect } from 'vitest';
import { SVGParser } from '../SVGParser';

describe('SVGParser', () => {
  describe('parse()', () => {
    it('should parse a simple SVG path', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 10 L 20 20 L 30 10 Z" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
      expect(curves[0].closed).toBe(true);
      expect(curves[0].points.length).toBeGreaterThan(0);
    });

    it('should parse multiple paths', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 0 L 10 10" />
          <path d="M 20 20 L 30 30" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(2);
    });

    it('should extract path IDs as names', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path id="my-path" d="M 0 0 L 10 10" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves[0].name).toBe('my-path');
    });

    it('should generate default names for unnamed paths', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 0 L 10 10" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves[0].name).toBe('Curve_1');
    });

    it('should handle invalid SVG gracefully', () => {
      const invalidSvg = 'not valid xml';

      // DOMParser returns a document with parsererror, SVGParser should handle it
      const curves = SVGParser.parse(invalidSvg);

      // Should return empty array for invalid SVG (no paths found)
      expect(curves).toEqual([]);
    });

    it('should skip paths with no d attribute', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path />
          <path d="M 0 0 L 10 10" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
    });
  });

  describe('parsePath()', () => {
    it('should parse M (move to) command', () => {
      const result = SVGParser.parsePath('M 10 20');

      expect(result.points).toHaveLength(1);
      expect(result.points[0].x).toBe(10);
      expect(result.points[0].y).toBe(20);
    });

    it('should parse L (line to) command', () => {
      const result = SVGParser.parsePath('M 0 0 L 10 10 L 20 0');

      expect(result.points.length).toBeGreaterThan(2);
      expect(result.closed).toBe(false);
    });

    it('should detect closed paths (Z command)', () => {
      const result = SVGParser.parsePath('M 0 0 L 10 10 L 10 0 Z');

      expect(result.closed).toBe(true);
    });

    it('should parse H (horizontal line) command', () => {
      const result = SVGParser.parsePath('M 0 0 H 10');

      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should parse V (vertical line) command', () => {
      const result = SVGParser.parsePath('M 0 0 V 10');

      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should parse C (cubic bezier) command', () => {
      const result = SVGParser.parsePath('M 0 0 C 10 10, 20 10, 30 0');

      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should parse Q (quadratic bezier) command', () => {
      const result = SVGParser.parsePath('M 0 0 Q 10 10, 20 0');

      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should handle A (arc) command', () => {
      const result = SVGParser.parsePath('M 10 10 A 5 5 0 0 1 20 10');

      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should handle empty path data', () => {
      expect(() => SVGParser.parsePath('')).toThrow();
    });
  });

  describe('parseBasicShapes()', () => {
    it('should parse rectangles', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="20" width="30" height="40" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
      expect(curves[0].name).toContain('Rectangle');
      expect(curves[0].closed).toBe(true);
      expect(curves[0].points).toHaveLength(4);
    });

    it('should parse circles', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="25" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
      expect(curves[0].name).toContain('Circle');
      expect(curves[0].closed).toBe(true);
      expect(curves[0].points.length).toBeGreaterThan(10); // Circle has many points
    });

    it('should parse ellipses', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="50" rx="30" ry="20" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
      expect(curves[0].name).toContain('Ellipse');
      expect(curves[0].closed).toBe(true);
    });

    it('should parse polygons', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <polygon points="10,10 20,20 30,10" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
      expect(curves[0].name).toContain('Polygon');
      expect(curves[0].closed).toBe(true);
      expect(curves[0].points).toHaveLength(3);
    });

    it('should handle polygon with space-separated points', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <polygon points="10 10 20 20 30 10" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
      expect(curves[0].points).toHaveLength(3);
    });

    it('should use shape IDs as names', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <rect id="my-rect" x="0" y="0" width="10" height="10" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves[0].name).toBe('my-rect');
    });
  });

  describe('generateId()', () => {
    it('should generate unique IDs', () => {
      const id1 = SVGParser.generateId();
      const id2 = SVGParser.generateId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^curve_/);
    });
  });

  describe('createCurve()', () => {
    it('should create a Curve object from parsed data', () => {
      const parsed = {
        name: 'TestCurve',
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] as any,
        closed: true,
        pathData: 'M 0 0 L 10 10 Z'
      };

      const curve = SVGParser.createCurve(parsed);

      expect(curve.id).toBeTruthy();
      expect(curve.name).toBe('TestCurve');
      expect(curve.type).toBe('svg');
      expect(curve.points).toHaveLength(2);
      expect(curve.closed).toBe(true);
      expect(curve.svgPath).toBe('M 0 0 L 10 10 Z');
      expect(curve.transform).toBeDefined();
      expect(curve.createdAt).toBeTruthy();
      expect(curve.modifiedAt).toBeTruthy();
    });

    it('should set default transform values', () => {
      const parsed = {
        name: 'TestCurve',
        points: [] as any,
        closed: false,
        pathData: ''
      };

      const curve = SVGParser.createCurve(parsed);

      expect(curve.transform.position.x).toBe(0);
      expect(curve.transform.position.y).toBe(0);
      expect(curve.transform.position.z).toBe(0);
      expect(curve.transform.scale.x).toBe(1);
      expect(curve.transform.scale.y).toBe(1);
    });
  });

  describe('Complex SVG parsing', () => {
    it('should handle SVG with multiple shape types', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 0 L 10 10" />
          <rect x="0" y="0" width="10" height="10" />
          <circle cx="50" cy="50" r="25" />
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(3);
    });

    it('should handle Figma-exported SVG', () => {
      // Typical Figma SVG export
      const svg = `
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 10 L30 30 L50 10 L70 30 L90 10" stroke="black" stroke-width="2"/>
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
      expect(curves[0].points.length).toBeGreaterThan(0);
    });

    it('should handle Illustrator-exported SVG', () => {
      // Typical Illustrator SVG export
      const svg = `
        <?xml version="1.0" encoding="utf-8"?>
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <path d="M50,50 L100,50 L100,100 Z"/>
        </svg>
      `;

      const curves = SVGParser.parse(svg);

      expect(curves).toHaveLength(1);
    });
  });
});
