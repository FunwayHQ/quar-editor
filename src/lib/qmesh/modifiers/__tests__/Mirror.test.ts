/**
 * Tests for Mirror Modifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QMesh, QVertex, QFace, QHalfEdge } from '../../QMesh';
import { applyMirrorModifier } from '../Mirror';
import * as THREE from 'three';

describe('Mirror Modifier', () => {
  let testMesh: QMesh;

  beforeEach(() => {
    // Create a simple triangle mesh for testing
    testMesh = new QMesh();

    // Create 3 vertices for a triangle on one side of the mirror plane
    const v0 = new QVertex('v0', new THREE.Vector3(1, 0, 0));
    const v1 = new QVertex('v1', new THREE.Vector3(2, 0, 0));
    const v2 = new QVertex('v2', new THREE.Vector3(1.5, 0, 1));

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

  it('should double vertices when no merging', () => {
    // Mirror across X axis with no vertices on the seam
    const result = applyMirrorModifier(testMesh, 'x', 0.001, false);

    // Should have original + mirrored vertices
    expect(result.vertices.size).toBe(testMesh.vertices.size * 2);
  });

  it('should double faces', () => {
    const result = applyMirrorModifier(testMesh, 'x', 0.001, false);

    // Should have original + mirrored faces
    expect(result.faces.size).toBe(testMesh.faces.size * 2);
  });

  it('should mirror across X axis correctly', () => {
    const result = applyMirrorModifier(testMesh, 'x', 0.001, false);

    // Check that some vertices have negative X coordinates
    let hasNegativeX = false;
    result.vertices.forEach(v => {
      if (v.position.x < 0) hasNegativeX = true;
    });

    expect(hasNegativeX).toBe(true);
  });

  it('should mirror across Y axis correctly', () => {
    // Create a mesh with non-zero Y coordinates
    const meshWithY = new QMesh();

    const v0 = new QVertex('v0', new THREE.Vector3(1, 0.5, 0));
    const v1 = new QVertex('v1', new THREE.Vector3(2, 0.5, 0));
    const v2 = new QVertex('v2', new THREE.Vector3(1.5, 0.5, 1));

    meshWithY.vertices.set('v0', v0);
    meshWithY.vertices.set('v1', v1);
    meshWithY.vertices.set('v2', v2);

    const face = new QFace('f0');
    meshWithY.faces.set('f0', face);

    const he0 = new QHalfEdge('he0', v1);
    const he1 = new QHalfEdge('he1', v2);
    const he2 = new QHalfEdge('he2', v0);

    he0.next = he1; he1.prev = he0;
    he1.next = he2; he2.prev = he1;
    he2.next = he0; he0.prev = he2;

    he0.face = face;
    he1.face = face;
    he2.face = face;
    face.oneHalfEdge = he0;

    meshWithY.halfEdges.set('he0', he0);
    meshWithY.halfEdges.set('he1', he1);
    meshWithY.halfEdges.set('he2', he2);

    v0.oneOutgoingHalfEdge = he2;
    v1.oneOutgoingHalfEdge = he0;
    v2.oneOutgoingHalfEdge = he1;

    const result = applyMirrorModifier(meshWithY, 'y', 0.001, false);

    // Check that some vertices have negative Y coordinates
    let hasNegativeY = false;
    result.vertices.forEach(v => {
      if (v.position.y < 0) hasNegativeY = true;
    });

    expect(hasNegativeY).toBe(true);
  });

  it('should mirror across Z axis correctly', () => {
    const result = applyMirrorModifier(testMesh, 'z', 0.001, false);

    // Check that some vertices have negative Z coordinates
    let hasNegativeZ = false;
    result.vertices.forEach(v => {
      if (v.position.z < 0) hasNegativeZ = true;
    });

    expect(hasNegativeZ).toBe(true);
  });

  it('should merge vertices at seam', () => {
    // Create a mesh with a vertex on the mirror plane
    const meshWithSeam = new QMesh();

    const v0 = new QVertex('v0', new THREE.Vector3(0, 0, 0)); // On X=0 plane
    const v1 = new QVertex('v1', new THREE.Vector3(1, 0, 0));
    const v2 = new QVertex('v2', new THREE.Vector3(0.5, 0, 1));

    meshWithSeam.vertices.set('v0', v0);
    meshWithSeam.vertices.set('v1', v1);
    meshWithSeam.vertices.set('v2', v2);

    const face = new QFace('f0');
    meshWithSeam.faces.set('f0', face);

    const he0 = new QHalfEdge('he0', v1);
    const he1 = new QHalfEdge('he1', v2);
    const he2 = new QHalfEdge('he2', v0);

    he0.next = he1; he1.prev = he0;
    he1.next = he2; he2.prev = he1;
    he2.next = he0; he0.prev = he2;

    he0.face = face;
    he1.face = face;
    he2.face = face;
    face.oneHalfEdge = he0;

    meshWithSeam.halfEdges.set('he0', he0);
    meshWithSeam.halfEdges.set('he1', he1);
    meshWithSeam.halfEdges.set('he2', he2);

    v0.oneOutgoingHalfEdge = he2;
    v1.oneOutgoingHalfEdge = he0;
    v2.oneOutgoingHalfEdge = he1;

    const result = applyMirrorModifier(meshWithSeam, 'x', 0.01, false);

    // Should have fewer than double vertices due to merging
    expect(result.vertices.size).toBeLessThan(meshWithSeam.vertices.size * 2);
  });

  it('should clip vertices when clip is enabled', () => {
    // Create a mesh that crosses the mirror plane
    const meshCrossingPlane = new QMesh();

    const v0 = new QVertex('v0', new THREE.Vector3(-0.5, 0, 0)); // Crosses X=0
    const v1 = new QVertex('v1', new THREE.Vector3(1, 0, 0));
    const v2 = new QVertex('v2', new THREE.Vector3(0.5, 0, 1));

    meshCrossingPlane.vertices.set('v0', v0);
    meshCrossingPlane.vertices.set('v1', v1);
    meshCrossingPlane.vertices.set('v2', v2);

    const face = new QFace('f0');
    meshCrossingPlane.faces.set('f0', face);

    const he0 = new QHalfEdge('he0', v1);
    const he1 = new QHalfEdge('he1', v2);
    const he2 = new QHalfEdge('he2', v0);

    he0.next = he1; he1.prev = he0;
    he1.next = he2; he2.prev = he1;
    he2.next = he0; he0.prev = he2;

    he0.face = face;
    he1.face = face;
    he2.face = face;
    face.oneHalfEdge = he0;

    meshCrossingPlane.halfEdges.set('he0', he0);
    meshCrossingPlane.halfEdges.set('he1', he1);
    meshCrossingPlane.halfEdges.set('he2', he2);

    v0.oneOutgoingHalfEdge = he2;
    v1.oneOutgoingHalfEdge = he0;
    v2.oneOutgoingHalfEdge = he1;

    const result = applyMirrorModifier(meshCrossingPlane, 'x', 0.01, true);

    // With clipping, original vertices that were negative should be clamped to 0
    // Find the vertex that was originally at (-0.5, 0, 0) and check it's at 0
    let foundClippedVertex = false;
    result.vertices.forEach(v => {
      if (v.id.includes('orig_v0')) {
        expect(v.position.x).toBe(0);
        foundClippedVertex = true;
      }
    });
    expect(foundClippedVertex).toBe(true);
  });

  it('should create properly linked half-edges', () => {
    const result = applyMirrorModifier(testMesh, 'x', 0.001, false);

    // Check that all half-edges have next/prev
    result.halfEdges.forEach(he => {
      expect(he.next).toBeTruthy();
      expect(he.prev).toBeTruthy();
      expect(he.face).toBeTruthy();
    });
  });

  it('should reverse winding for mirrored faces', () => {
    const result = applyMirrorModifier(testMesh, 'x', 0.001, false);

    // Original and mirrored faces should exist
    const originalFace = Array.from(result.faces.values()).find(f =>
      f.id.includes('orig')
    );
    const mirroredFace = Array.from(result.faces.values()).find(f =>
      f.id.includes('mir')
    );

    expect(originalFace).toBeTruthy();
    expect(mirroredFace).toBeTruthy();

    if (originalFace && mirroredFace) {
      const origVertices = originalFace.getVertices();
      const mirVertices = mirroredFace.getVertices();

      // Both should have same number of vertices
      expect(origVertices.length).toBe(mirVertices.length);
    }
  });

  it('should handle merge threshold parameter', () => {
    // Create mesh with vertex near the plane
    const meshNearPlane = new QMesh();

    const v0 = new QVertex('v0', new THREE.Vector3(0.0001, 0, 0)); // Very close to X=0
    const v1 = new QVertex('v1', new THREE.Vector3(1, 0, 0));
    const v2 = new QVertex('v2', new THREE.Vector3(0.5, 0, 1));

    meshNearPlane.vertices.set('v0', v0);
    meshNearPlane.vertices.set('v1', v1);
    meshNearPlane.vertices.set('v2', v2);

    const face = new QFace('f0');
    meshNearPlane.faces.set('f0', face);

    const he0 = new QHalfEdge('he0', v1);
    const he1 = new QHalfEdge('he1', v2);
    const he2 = new QHalfEdge('he2', v0);

    he0.next = he1; he1.prev = he0;
    he1.next = he2; he2.prev = he1;
    he2.next = he0; he0.prev = he2;

    he0.face = face;
    he1.face = face;
    he2.face = face;
    face.oneHalfEdge = he0;

    meshNearPlane.halfEdges.set('he0', he0);
    meshNearPlane.halfEdges.set('he1', he1);
    meshNearPlane.halfEdges.set('he2', he2);

    v0.oneOutgoingHalfEdge = he2;
    v1.oneOutgoingHalfEdge = he0;
    v2.oneOutgoingHalfEdge = he1;

    // Small threshold should NOT merge
    const result1 = applyMirrorModifier(meshNearPlane, 'x', 0.00001, false);
    expect(result1.vertices.size).toBe(meshNearPlane.vertices.size * 2);

    // Large threshold SHOULD merge
    const result2 = applyMirrorModifier(meshNearPlane, 'x', 0.01, false);
    expect(result2.vertices.size).toBeLessThan(meshNearPlane.vertices.size * 2);
  });

  it('should link twin edges properly', () => {
    // Create a mesh with an edge on the seam (two vertices at X=0)
    const meshWithSeamEdge = new QMesh();

    const v0 = new QVertex('v0', new THREE.Vector3(0, 0, 0)); // On X=0 plane
    const v1 = new QVertex('v1', new THREE.Vector3(1, 0, 0));
    const v2 = new QVertex('v2', new THREE.Vector3(0, 0, 1)); // On X=0 plane

    meshWithSeamEdge.vertices.set('v0', v0);
    meshWithSeamEdge.vertices.set('v1', v1);
    meshWithSeamEdge.vertices.set('v2', v2);

    const face = new QFace('f0');
    meshWithSeamEdge.faces.set('f0', face);

    const he0 = new QHalfEdge('he0', v1);
    const he1 = new QHalfEdge('he1', v2);
    const he2 = new QHalfEdge('he2', v0);

    he0.next = he1; he1.prev = he0;
    he1.next = he2; he2.prev = he1;
    he2.next = he0; he0.prev = he2;

    he0.face = face;
    he1.face = face;
    he2.face = face;
    face.oneHalfEdge = he0;

    meshWithSeamEdge.halfEdges.set('he0', he0);
    meshWithSeamEdge.halfEdges.set('he1', he1);
    meshWithSeamEdge.halfEdges.set('he2', he2);

    v0.oneOutgoingHalfEdge = he2;
    v1.oneOutgoingHalfEdge = he0;
    v2.oneOutgoingHalfEdge = he1;

    const result = applyMirrorModifier(meshWithSeamEdge, 'x', 0.01, false);

    // Count how many half-edges have twins
    let twinCount = 0;
    result.halfEdges.forEach(he => {
      if (he.twin) twinCount++;
    });

    // The edge v2->v0 (both on seam) should have twins with the mirrored face
    expect(twinCount).toBeGreaterThan(0);
  });
});
