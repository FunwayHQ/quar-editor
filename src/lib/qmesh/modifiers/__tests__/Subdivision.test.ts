/**
 * Tests for Subdivision Surface Modifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QMesh, QVertex, QFace, QHalfEdge } from '../../QMesh';
import { applySubdivisionModifier } from '../Subdivision';
import * as THREE from 'three';

describe('Subdivision Surface Modifier', () => {
  let testMesh: QMesh;

  beforeEach(() => {
    // Create a simple quad mesh for testing
    testMesh = new QMesh();

    // Create 4 vertices for a square
    const v0 = new QVertex('v0', new THREE.Vector3(-1, 0, -1));
    const v1 = new QVertex('v1', new THREE.Vector3(1, 0, -1));
    const v2 = new QVertex('v2', new THREE.Vector3(1, 0, 1));
    const v3 = new QVertex('v3', new THREE.Vector3(-1, 0, 1));

    testMesh.vertices.set('v0', v0);
    testMesh.vertices.set('v1', v1);
    testMesh.vertices.set('v2', v2);
    testMesh.vertices.set('v3', v3);

    // Create a quad face
    const face = new QFace('f0');
    testMesh.faces.set('f0', face);

    // Create half-edges for the quad
    const he0 = new QHalfEdge('he0', v1);
    const he1 = new QHalfEdge('he1', v2);
    const he2 = new QHalfEdge('he2', v3);
    const he3 = new QHalfEdge('he3', v0);

    // Link next/prev
    he0.next = he1; he1.prev = he0;
    he1.next = he2; he2.prev = he1;
    he2.next = he3; he3.prev = he2;
    he3.next = he0; he0.prev = he3;

    // Link to face
    he0.face = face;
    he1.face = face;
    he2.face = face;
    he3.face = face;
    face.oneHalfEdge = he0;

    // Add to mesh
    testMesh.halfEdges.set('he0', he0);
    testMesh.halfEdges.set('he1', he1);
    testMesh.halfEdges.set('he2', he2);
    testMesh.halfEdges.set('he3', he3);

    // Link vertex outgoing edges
    v0.oneOutgoingHalfEdge = he3;
    v1.oneOutgoingHalfEdge = he0;
    v2.oneOutgoingHalfEdge = he1;
    v3.oneOutgoingHalfEdge = he2;

    // Link twins (for a single face, no twins exist, but we can add them if needed)
  });

  it('should increase vertex count after subdivision', () => {
    const result = applySubdivisionModifier(testMesh, 1);

    // After 1 iteration on a quad:
    // - 1 face point
    // - 4 edge points
    // - 4 vertex points
    // Total: 9 vertices
    expect(result.vertices.size).toBeGreaterThan(testMesh.vertices.size);
  });

  it('should increase face count after subdivision', () => {
    const result = applySubdivisionModifier(testMesh, 1);

    // A quad should create 4 new quads
    expect(result.faces.size).toBe(4);
  });

  it('should create only quad faces after subdivision', () => {
    const result = applySubdivisionModifier(testMesh, 1);

    result.faces.forEach(face => {
      const vertices = face.getVertices();
      expect(vertices.length).toBe(4); // All faces should be quads
    });
  });

  it('should handle multiple subdivision levels', () => {
    const result1 = applySubdivisionModifier(testMesh, 1);
    const result2 = applySubdivisionModifier(testMesh, 2);

    expect(result2.vertices.size).toBeGreaterThan(result1.vertices.size);
    expect(result2.faces.size).toBeGreaterThan(result1.faces.size);
  });

  it('should smooth the mesh (vertices should move)', () => {
    const result = applySubdivisionModifier(testMesh, 1);

    // Check that some vertices have moved from original positions
    let hasMovedVertices = false;
    const originalPositions = new Set<string>();

    testMesh.vertices.forEach(v => {
      originalPositions.add(`${v.position.x},${v.position.y},${v.position.z}`);
    });

    result.vertices.forEach(v => {
      const key = `${v.position.x},${v.position.y},${v.position.z}`;
      if (!originalPositions.has(key)) {
        hasMovedVertices = true;
      }
    });

    expect(hasMovedVertices).toBe(true);
  });

  it('should create properly linked half-edges', () => {
    const result = applySubdivisionModifier(testMesh, 1);

    // Check that all half-edges have next/prev
    result.halfEdges.forEach(he => {
      expect(he.next).toBeTruthy();
      expect(he.prev).toBeTruthy();
      expect(he.face).toBeTruthy();
    });
  });

  it('should maintain face center position', () => {
    const originalCenter = testMesh.faces.get('f0')!.calculateCenter();
    const result = applySubdivisionModifier(testMesh, 1);

    // The subdivided mesh should still have faces near the original center
    let hasCenterFace = false;
    result.faces.forEach(face => {
      const center = face.calculateCenter();
      if (center.distanceTo(originalCenter) < 0.5) {
        hasCenterFace = true;
      }
    });

    expect(hasCenterFace).toBe(true);
  });

  it('should handle zero subdivision levels', () => {
    const result = applySubdivisionModifier(testMesh, 0);

    // Should return the mesh unchanged
    expect(result.vertices.size).toBe(testMesh.vertices.size);
    expect(result.faces.size).toBe(testMesh.faces.size);
  });

  it('should link twin edges properly', () => {
    const result = applySubdivisionModifier(testMesh, 1);

    // Count how many half-edges have twins
    let twinCount = 0;
    result.halfEdges.forEach(he => {
      if (he.twin) twinCount++;
    });

    // Most edges should have twins (except boundary edges)
    expect(twinCount).toBeGreaterThan(0);
  });

  it('should preserve mesh topology', () => {
    const result = applySubdivisionModifier(testMesh, 1);

    // Check that all faces are valid (have vertices)
    result.faces.forEach(face => {
      const vertices = face.getVertices();
      expect(vertices.length).toBeGreaterThan(0);
    });

    // Check that all vertices are used
    const usedVertices = new Set<string>();
    result.faces.forEach(face => {
      face.getVertices().forEach(v => usedVertices.add(v.id));
    });

    expect(usedVertices.size).toBe(result.vertices.size);
  });
});
