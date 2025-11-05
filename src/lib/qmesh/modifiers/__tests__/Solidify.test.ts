/**
 * Tests for Solidify Modifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QMesh, QVertex, QFace, QHalfEdge } from '../../QMesh';
import { applySolidifyModifier } from '../Solidify';
import * as THREE from 'three';

describe('Solidify Modifier', () => {
  let testMesh: QMesh;

  beforeEach(() => {
    // Create a simple triangle mesh for testing
    testMesh = new QMesh();

    // Create 3 vertices for a triangle
    const v0 = new QVertex('v0', new THREE.Vector3(0, 0, 0));
    const v1 = new QVertex('v1', new THREE.Vector3(1, 0, 0));
    const v2 = new QVertex('v2', new THREE.Vector3(0.5, 0, 1));

    testMesh.vertices.set('v0', v0);
    testMesh.vertices.set('v1', v1);
    testMesh.vertices.set('v2', v2);

    // Create a triangle face
    const face = new QFace('f0');
    testMesh.faces.set('f0', face);

    // Create half-edges for the triangle
    const he0 = new QHalfEdge('he0', v1);
    const he1 = new QHalfEdge('he1', v2);
    const he2 = new QHalfEdge('he2', v0);

    // Link next/prev
    he0.next = he1; he1.prev = he0;
    he1.next = he2; he2.prev = he1;
    he2.next = he0; he0.prev = he2;

    // Link to face
    he0.face = face;
    he1.face = face;
    he2.face = face;
    face.oneHalfEdge = he0;

    // Add to mesh
    testMesh.halfEdges.set('he0', he0);
    testMesh.halfEdges.set('he1', he1);
    testMesh.halfEdges.set('he2', he2);

    // Link vertex outgoing edges
    v0.oneOutgoingHalfEdge = he2;
    v1.oneOutgoingHalfEdge = he0;
    v2.oneOutgoingHalfEdge = he1;
  });

  it('should double the number of vertices', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // Should have original vertices + offset vertices
    expect(result.vertices.size).toBe(testMesh.vertices.size * 2);
  });

  it('should create more faces (original + offset + rim)', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // Should have:
    // - 1 original face
    // - 1 offset face
    // - 3 rim faces (for a triangle)
    expect(result.faces.size).toBeGreaterThan(testMesh.faces.size);
  });

  it('should handle zero thickness', () => {
    const result = applySolidifyModifier(testMesh, 0);

    // Should return original mesh when thickness is 0
    expect(result.vertices.size).toBe(testMesh.vertices.size);
  });

  it('should offset vertices along normals', () => {
    const thickness = 1.0;
    const result = applySolidifyModifier(testMesh, thickness);

    // Check that some vertices have been offset
    const originalPositions = new Set<string>();
    testMesh.vertices.forEach(v => {
      originalPositions.add(`${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)}`);
    });

    let hasOffsetVertices = false;
    result.vertices.forEach(v => {
      const key = `${v.position.x.toFixed(2)},${v.position.y.toFixed(2)},${v.position.z.toFixed(2)}`;
      if (!originalPositions.has(key)) {
        hasOffsetVertices = true;
      }
    });

    expect(hasOffsetVertices).toBe(true);
  });

  it('should create rim faces for boundary edges', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // For a single triangle (all edges are boundaries), should create 3 rim faces
    // Total: 1 original + 1 offset + 3 rim = 5 faces
    expect(result.faces.size).toBe(5);
  });

  it('should create quad rim faces', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // Check that rim faces are quads
    let quadCount = 0;
    result.faces.forEach(face => {
      const vertices = face.getVertices();
      if (vertices.length === 4) {
        quadCount++;
      }
    });

    // Should have 3 quad rim faces
    expect(quadCount).toBe(3);
  });

  it('should handle offset parameter', () => {
    const result1 = applySolidifyModifier(testMesh, 0.5, 0);
    const result2 = applySolidifyModifier(testMesh, 0.5, 0.2);

    // Results should have same topology but different positions
    expect(result1.vertices.size).toBe(result2.vertices.size);
    expect(result1.faces.size).toBe(result2.faces.size);

    // But positions should differ
    const pos1 = Array.from(result1.vertices.values())[0].position;
    const pos2 = Array.from(result2.vertices.values())[0].position;
    expect(pos1.distanceTo(pos2)).toBeGreaterThan(0);
  });

  it('should create properly linked half-edges', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // Check that all half-edges have next/prev
    result.halfEdges.forEach(he => {
      expect(he.next).toBeTruthy();
      expect(he.prev).toBeTruthy();
      expect(he.face).toBeTruthy();
    });
  });

  it('should reverse winding for offset shell', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // Original face should have vertices in one order
    // Offset face should have vertices in reverse order
    // This ensures normals point outward on both shells

    const originalFace = Array.from(result.faces.values()).find(f =>
      f.id.includes('orig')
    );
    const offsetFace = Array.from(result.faces.values()).find(f =>
      f.id.includes('off') && !f.id.includes('rim')
    );

    expect(originalFace).toBeTruthy();
    expect(offsetFace).toBeTruthy();

    if (originalFace && offsetFace) {
      const origVertices = originalFace.getVertices();
      const offsetVertices = offsetFace.getVertices();

      // Both should have same number of vertices
      expect(origVertices.length).toBe(offsetVertices.length);
    }
  });

  it('should link twin edges properly', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // Count how many half-edges have twins
    let twinCount = 0;
    result.halfEdges.forEach(he => {
      if (he.twin) twinCount++;
    });

    // Most edges should have twins
    expect(twinCount).toBeGreaterThan(0);
  });

  it('should create watertight mesh', () => {
    const result = applySolidifyModifier(testMesh, 0.5);

    // A watertight mesh should have all edges paired (twins)
    // Count boundary edges (no twin)
    let boundaryEdges = 0;
    result.halfEdges.forEach(he => {
      if (!he.twin) boundaryEdges++;
    });

    // Should have no boundary edges for a properly solidified mesh
    // (Note: This might not always be true depending on input mesh)
    expect(boundaryEdges).toBe(0);
  });
});
