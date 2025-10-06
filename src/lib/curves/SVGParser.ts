/**
 * SVG Parser
 *
 * Parses SVG files and extracts 2D curves for 3D modeling operations.
 */

import * as THREE from 'three';
import { parseSVG } from 'svg-path-parser';
import { Curve } from '../../stores/curveStore';

interface ParsedCurve {
  name: string;
  points: THREE.Vector2[];
  closed: boolean;
  pathData: string;
}

export class SVGParser {
  /**
   * Parse an SVG file and extract all curves
   */
  static parse(svgText: string): ParsedCurve[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.warn('SVG parsing error, returning empty curves');
      return [];
    }

    const curves: ParsedCurve[] = [];

    // Extract all path elements
    const paths = doc.querySelectorAll('path');
    paths.forEach((path, index) => {
      const pathData = path.getAttribute('d');
      if (!pathData) return;

      try {
        const curve = this.parsePath(pathData);
        curves.push({
          name: path.getAttribute('id') || `Curve_${index + 1}`,
          points: curve.points,
          closed: curve.closed,
          pathData
        });
      } catch (error) {
        console.warn(`Failed to parse path ${index}:`, error);
      }
    });

    // Also handle basic SVG shapes (rect, circle, ellipse, polygon, polyline)
    curves.push(...this.parseBasicShapes(doc));

    return curves;
  }

  /**
   * Parse an SVG path data string to Three.js points
   */
  static parsePath(pathData: string): { points: THREE.Vector2[]; closed: boolean } {
    if (!pathData || pathData.trim() === '') {
      throw new Error('Empty path data');
    }

    try {
      const commands = parseSVG(pathData);
      const shape = new THREE.Shape();

      let currentX = 0;
      let currentY = 0;
      let closed = false;

      commands.forEach(cmd => {
        switch (cmd.code) {
          case 'M': // Move to
            currentX = cmd.x || 0;
            currentY = cmd.y || 0;
            shape.moveTo(currentX, currentY);
            break;

          case 'L': // Line to
            currentX = cmd.x || 0;
            currentY = cmd.y || 0;
            shape.lineTo(currentX, currentY);
            break;

          case 'H': // Horizontal line
            currentX = cmd.x || 0;
            shape.lineTo(currentX, currentY);
            break;

          case 'V': // Vertical line
            currentY = cmd.y || 0;
            shape.lineTo(currentX, currentY);
            break;

          case 'C': // Cubic bezier
            shape.bezierCurveTo(
              cmd.x1 || 0, cmd.y1 || 0,
              cmd.x2 || 0, cmd.y2 || 0,
              cmd.x || 0, cmd.y || 0
            );
            currentX = cmd.x || 0;
            currentY = cmd.y || 0;
            break;

          case 'Q': // Quadratic bezier
            shape.quadraticCurveTo(
              cmd.x1 || 0, cmd.y1 || 0,
              cmd.x || 0, cmd.y || 0
            );
            currentX = cmd.x || 0;
            currentY = cmd.y || 0;
            break;

          case 'A': // Arc (approximate with bezier)
            // For now, simplify arcs to lines
            // TODO: Implement proper arc-to-bezier conversion
            currentX = cmd.x || 0;
            currentY = cmd.y || 0;
            shape.lineTo(currentX, currentY);
            break;

          case 'Z': // Close path
            shape.closePath();
            closed = true;
            break;

          default:
            console.warn(`Unknown SVG command: ${cmd.code}`);
        }
      });

      // Extract points from shape
      let points = shape.getPoints(50); // 50 segments per curve

      // If no points from curves, use raw currentPoints
      if (points.length === 0) {
        points = shape.currentPoints || [];
      }

      // If still no points, at least return the starting point
      if (points.length === 0 && currentX !== undefined && currentY !== undefined) {
        points = [new THREE.Vector2(currentX, currentY)];
      }

      return { points, closed };
    } catch (error) {
      console.error('Failed to parse SVG path:', error);
      throw error;
    }
  }

  /**
   * Parse basic SVG shapes (rect, circle, ellipse, etc.)
   */
  static parseBasicShapes(doc: Document): ParsedCurve[] {
    const curves: ParsedCurve[] = [];

    // Rectangles
    doc.querySelectorAll('rect').forEach((rect, index) => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const width = parseFloat(rect.getAttribute('width') || '0');
      const height = parseFloat(rect.getAttribute('height') || '0');

      const points = [
        new THREE.Vector2(x, y),
        new THREE.Vector2(x + width, y),
        new THREE.Vector2(x + width, y + height),
        new THREE.Vector2(x, y + height)
      ];

      curves.push({
        name: rect.getAttribute('id') || `Rectangle_${index + 1}`,
        points,
        closed: true,
        pathData: `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`
      });
    });

    // Circles
    doc.querySelectorAll('circle').forEach((circle, index) => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');

      const shape = new THREE.Shape();
      shape.absarc(cx, cy, r, 0, Math.PI * 2, false);
      const points = shape.getPoints(50);

      curves.push({
        name: circle.getAttribute('id') || `Circle_${index + 1}`,
        points,
        closed: true,
        pathData: `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`
      });
    });

    // Ellipses
    doc.querySelectorAll('ellipse').forEach((ellipse, index) => {
      const cx = parseFloat(ellipse.getAttribute('cx') || '0');
      const cy = parseFloat(ellipse.getAttribute('cy') || '0');
      const rx = parseFloat(ellipse.getAttribute('rx') || '0');
      const ry = parseFloat(ellipse.getAttribute('ry') || '0');

      const shape = new THREE.Shape();
      shape.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
      const points = shape.getPoints(50);

      curves.push({
        name: ellipse.getAttribute('id') || `Ellipse_${index + 1}`,
        points,
        closed: true,
        pathData: `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} Z`
      });
    });

    // Polygons
    doc.querySelectorAll('polygon').forEach((polygon, index) => {
      const pointsStr = polygon.getAttribute('points') || '';
      const pointPairs = pointsStr.trim().split(/\s+|,/).filter(p => p);

      const points: THREE.Vector2[] = [];
      for (let i = 0; i < pointPairs.length; i += 2) {
        const x = parseFloat(pointPairs[i]);
        const y = parseFloat(pointPairs[i + 1]);
        if (!isNaN(x) && !isNaN(y)) {
          points.push(new THREE.Vector2(x, y));
        }
      }

      if (points.length > 0) {
        curves.push({
          name: polygon.getAttribute('id') || `Polygon_${index + 1}`,
          points,
          closed: true,
          pathData: `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
        });
      }
    });

    return curves;
  }

  /**
   * Generate a unique ID for a curve
   */
  static generateId(): string {
    return `curve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Normalize and center curve points for viewport
   */
  static normalizeCurve(points: THREE.Vector2[]): THREE.Vector2[] {
    if (points.length === 0) return points;

    // Find bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    points.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const maxDim = Math.max(width, height);

    // Center point
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Scale to fit within 5 units (half of 10x10 grid)
    const scale = maxDim > 0 ? 5 / maxDim : 1;

    // Normalize: center and scale
    return points.map(p => new THREE.Vector2(
      (p.x - centerX) * scale,
      (p.y - centerY) * scale
    ));
  }

  /**
   * Create a Curve object from parsed data
   */
  static createCurve(parsed: ParsedCurve): Curve {
    // Normalize points to fit in viewport
    const normalizedPoints = this.normalizeCurve(parsed.points);

    return {
      id: this.generateId(),
      name: parsed.name,
      type: 'svg',
      points: normalizedPoints,
      closed: parsed.closed,
      svgPath: parsed.pathData,
      transform: {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector2(1, 1)
      },
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };
  }
}
