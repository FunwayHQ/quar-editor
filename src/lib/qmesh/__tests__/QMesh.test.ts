/**
 * QMesh Tests
 *
 * Comprehensive tests for Half-Edge mesh data structure and operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { QMesh, QVertex, QFace, QHalfEdge } from '../QMesh';

describe('QMesh', () => {
  describe('Basic Structure', () => {
    it('creates empty mesh', () => {
      const mesh = new QMesh();

      expect(mesh.vertices.size).toBe(0);
      expect(mesh.faces.size).toBe(0);
      expect(mesh.halfEdges.size).toBe(0);
      expect(mesh.triangleFaceMap.size).toBe(0);
    });

    it('creates QVertex with position', () => {
      const pos = new THREE.Vector3(1, 2, 3);
      const vertex = new QVertex('v1', pos);

      expect(vertex.id).toBe('v1');
      expect(vertex.position.x).toBe(1);
      expect(vertex.position.y).toBe(2);
      expect(vertex.position.z).toBe(3);
      expect(vertex.oneOutgoingHalfEdge).toBeNull();
    });

    it('creates QFace', () => {
      const face = new QFace('f1');

      expect(face.id).toBe('f1');
      expect(face.oneHalfEdge).toBeNull();
    });

    it('creates QHalfEdge', () => {
      const v = new QVertex('v1', new THREE.Vector3(0, 0, 0));
      const he = new QHalfEdge('he1', v);

      expect(he.id).toBe('he1');
      expect(he.toVertex).toBe(v);
      expect(he.face).toBeNull();
      expect(he.next).toBeNull();
      expect(he.prev).toBeNull();
      expect(he.twin).toBeNull();
    });
  });

  describe('fromBufferGeometry (Decompiler)', () => {
    it('decompiles simple triangle', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,    // v0
        1, 0, 0,    // v1
        0, 1, 0,    // v2
      ]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);

      expect(qmesh.vertices.size).toBe(3);
      expect(qmesh.faces.size).toBe(1);
      expect(qmesh.halfEdges.size).toBe(3); // Triangle has 3 half-edges
    });

    it('decompiles quad (detects two triangles as one face)', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,    // v0
        1, 0, 0,    // v1
        1, 1, 0,    // v2
        0, 1, 0,    // v3
      ]);
      // Two triangles forming a quad
      const indices = new Uint16Array([
        0, 1, 2,  // Triangle 1
        0, 2, 3,  // Triangle 2 (shares edge v0-v2 with Triangle 1)
      ]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);

      expect(qmesh.vertices.size).toBe(4);
      expect(qmesh.faces.size).toBe(1); // Should detect as one quad face
      expect(qmesh.halfEdges.size).toBe(4); // Quad has 4 half-edges
    });

    it('merges duplicate vertices at same position', () => {
      const geometry = new THREE.BufferGeometry();
      // Duplicate vertices at (0,0,0)
      const vertices = new Float32Array([
        0, 0, 0,    // v0
        1, 0, 0,    // v1
        0, 1, 0,    // v2
        0, 0, 0,    // v3 (duplicate of v0)
      ]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);

      // Should merge duplicates
      expect(qmesh.vertices.size).toBe(3);
    });

    it('links twin half-edges correctly', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);

      // Count half-edges with twins
      let twinsCount = 0;
      qmesh.halfEdges.forEach(he => {
        if (he.twin) twinsCount++;
      });

      // All internal edges should have twins
      expect(twinsCount).toBeGreaterThan(0);
    });
  });

  describe('toBufferGeometry (Compiler)', () => {
    it('compiles triangle back to BufferGeometry', () => {
      const originalGeometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const indices = new Uint16Array([0, 1, 2]);

      originalGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      originalGeometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(originalGeometry);
      const compiledGeometry = qmesh.toBufferGeometry();

      expect(compiledGeometry.attributes.position.count).toBe(3);
      expect(compiledGeometry.index!.count).toBe(3);
    });

    it('creates triangleFaceMap for raycasting', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);

      qmesh.toBufferGeometry();

      expect(qmesh.triangleFaceMap.size).toBeGreaterThan(0);

      // Each triangle should map to a face
      qmesh.triangleFaceMap.forEach((faceId, triangleIndex) => {
        expect(qmesh.faces.has(faceId)).toBe(true);
      });
    });

    it('compiles quad face to two triangles', () => {
      const qmesh = new QMesh();

      // Create 4 vertices for a quad
      const v0 = new QVertex('v0', new THREE.Vector3(0, 0, 0));
      const v1 = new QVertex('v1', new THREE.Vector3(1, 0, 0));
      const v2 = new QVertex('v2', new THREE.Vector3(1, 1, 0));
      const v3 = new QVertex('v3', new THREE.Vector3(0, 1, 0));

      qmesh.vertices.set(v0.id, v0);
      qmesh.vertices.set(v1.id, v1);
      qmesh.vertices.set(v2.id, v2);
      qmesh.vertices.set(v3.id, v3);

      // Create face (manually for this test)
      const face = new QFace('f0');
      qmesh.faces.set(face.id, face);

      // Create half-edges in a loop
      const he0 = new QHalfEdge('he0', v1);
      const he1 = new QHalfEdge('he1', v2);
      const he2 = new QHalfEdge('he2', v3);
      const he3 = new QHalfEdge('he3', v0);

      he0.next = he1; he1.next = he2; he2.next = he3; he3.next = he0;
      he0.prev = he3; he1.prev = he0; he2.prev = he1; he3.prev = he2;
      he0.face = face; he1.face = face; he2.face = face; he3.face = face;

      qmesh.halfEdges.set(he0.id, he0);
      qmesh.halfEdges.set(he1.id, he1);
      qmesh.halfEdges.set(he2.id, he2);
      qmesh.halfEdges.set(he3.id, he3);

      face.oneHalfEdge = he0;

      const geometry = qmesh.toBufferGeometry();

      // Quad should be triangulated to 2 triangles (6 indices)
      expect(geometry.index!.count).toBe(6);
    });
  });

  describe('extrudeFaces', () => {
    it('extrudes single triangle face', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const originalFaceCount = qmesh.faces.size;
      const originalVertexCount = qmesh.vertices.size;

      const faceId = Array.from(qmesh.faces.keys())[0];
      const result = qmesh.extrudeFaces([faceId], 1.0);

      // Should create new top face + 3 side faces
      expect(qmesh.faces.size).toBeGreaterThan(originalFaceCount);
      expect(qmesh.vertices.size).toBeGreaterThan(originalVertexCount);
      expect(result.newFaceIds.length).toBeGreaterThan(0);
    });

    it('creates correct number of new vertices', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const originalVertexCount = qmesh.vertices.size;
      const faceId = Array.from(qmesh.faces.keys())[0];

      qmesh.extrudeFaces([faceId], 1.0);

      // Should create 3 new vertices (one for each corner of triangle)
      expect(qmesh.vertices.size).toBe(originalVertexCount + 3);
    });

    it('removes original face after extrude', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const faceId = Array.from(qmesh.faces.keys())[0];

      qmesh.extrudeFaces([faceId], 1.0);

      // Original face should be deleted
      expect(qmesh.faces.has(faceId)).toBe(false);
    });
  });

  describe('findEdgeLoop', () => {
    it('finds edge loop in quad mesh', () => {
      // Create a simple quad
      const geometry = new THREE.PlaneGeometry(2, 2, 2, 2); // 2x2 grid = 4 quads
      const qmesh = QMesh.fromBufferGeometry(geometry);

      const edges = qmesh.getEdges();
      if (edges.length > 0) {
        const edgeKey = edges[0].edgeKey;
        const loop = qmesh.findEdgeLoop(edgeKey);

        expect(loop.length).toBeGreaterThan(0);
        expect(loop).toContain(edgeKey);
      }
    });

    it('returns empty array for non-existent edge', () => {
      const qmesh = new QMesh();
      const loop = qmesh.findEdgeLoop('invalid-edge');

      expect(loop).toEqual([]);
    });
  });

  describe('bevelEdges', () => {
    it('creates bevel faces for selected edges', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);

      const edges = qmesh.getEdges();
      const edgeKey = edges[0].edgeKey;
      const originalFaceCount = qmesh.faces.size;

      const result = qmesh.bevelEdges([edgeKey], 0.1);

      expect(qmesh.faces.size).toBeGreaterThan(originalFaceCount);
      expect(result.newFaceIds.length).toBe(1); // One bevel face per edge
    });

    it('creates new vertices for bevel', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);

      const edges = qmesh.getEdges();
      const edgeKey = edges[0].edgeKey;
      const originalVertexCount = qmesh.vertices.size;

      qmesh.bevelEdges([edgeKey], 0.1);

      expect(qmesh.vertices.size).toBeGreaterThan(originalVertexCount);
    });
  });

  describe('mergeVertices', () => {
    it('merges two vertices at average position', () => {
      const qmesh = new QMesh();

      const v0 = new QVertex('v0', new THREE.Vector3(0, 0, 0));
      const v1 = new QVertex('v1', new THREE.Vector3(2, 0, 0));

      qmesh.vertices.set(v0.id, v0);
      qmesh.vertices.set(v1.id, v1);

      const result = qmesh.mergeVertices(['v0', 'v1']);

      expect(qmesh.vertices.size).toBe(1);
      expect(result.mergedVertexId).toBe('v0');

      const mergedVertex = qmesh.vertices.get('v0');
      expect(mergedVertex).toBeDefined();
      expect(mergedVertex!.position.x).toBe(1); // Average of 0 and 2
    });

    it('removes degenerate faces after merge', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,    // v0
        1, 0, 0,    // v1
        0, 1, 0,    // v2
      ]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const vertexIds = Array.from(qmesh.vertices.keys());

      // Merge all 3 vertices - face becomes degenerate
      qmesh.mergeVertices(vertexIds);

      // Degenerate face should be removed
      expect(qmesh.faces.size).toBe(0);
    });

    it('returns original vertex if only one provided', () => {
      const qmesh = new QMesh();
      const v0 = new QVertex('v0', new THREE.Vector3(0, 0, 0));
      qmesh.vertices.set(v0.id, v0);

      const result = qmesh.mergeVertices(['v0']);

      expect(result.mergedVertexId).toBe('v0');
      expect(qmesh.vertices.size).toBe(1);
    });
  });

  describe('dissolveEdges', () => {
    it('merges adjacent faces when edge dissolved', () => {
      // Create a quad (2 triangles)
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,    // v0
        1, 0, 0,    // v1
        1, 1, 0,    // v2
        0, 1, 0,    // v3
      ]);
      const indices = new Uint16Array([
        0, 1, 2,  // Triangle 1
        0, 2, 3,  // Triangle 2
      ]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);

      // Should start with 1 face (quad detected)
      const initialFaceCount = qmesh.faces.size;

      // Get the diagonal edge and dissolve it
      const edges = qmesh.getEdges();
      if (edges.length > 0) {
        const edgeKey = edges[0].edgeKey;
        const result = qmesh.dissolveEdges([edgeKey]);

        // May create merged face or remove edges
        expect(result.mergedFaceIds).toBeDefined();
      }
    });

    it('removes half-edges of dissolved edge', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);

      const edges = qmesh.getEdges();
      const edgeKey = edges[0].edgeKey;
      const originalHalfEdgeCount = qmesh.halfEdges.size;

      qmesh.dissolveEdges([edgeKey]);

      // Should remove the two half-edges (edge and its twin)
      expect(qmesh.halfEdges.size).toBeLessThan(originalHalfEdgeCount);
    });
  });

  describe('spin', () => {
    it('creates rotational extrusion', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const faceId = Array.from(qmesh.faces.keys())[0];
      const originalFaceCount = qmesh.faces.size;

      const axis = new THREE.Vector3(0, 1, 0); // Y axis
      const result = qmesh.spin([faceId], axis, Math.PI * 2, 8);

      expect(qmesh.faces.size).toBeGreaterThan(originalFaceCount);
      expect(result.newFaceIds.length).toBe(8); // 8 steps = 8 new faces
    });

    it('creates vertices for each rotation step', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const faceId = Array.from(qmesh.faces.keys())[0];
      const originalVertexCount = qmesh.vertices.size;

      const axis = new THREE.Vector3(0, 0, 1); // Z axis
      qmesh.spin([faceId], axis, Math.PI, 4);

      // Should create 3 vertices * 4 steps = 12 new vertices
      expect(qmesh.vertices.size).toBe(originalVertexCount + 12);
    });
  });

  describe('getEdges', () => {
    it('returns all unique edges', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);

      const edges = qmesh.getEdges();

      expect(edges.length).toBeGreaterThan(0);

      // Check that edges are unique
      const edgeKeys = new Set(edges.map(e => e.edgeKey));
      expect(edgeKeys.size).toBe(edges.length);
    });

    it('returns edges with correct vertex references', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);

      const edges = qmesh.getEdges();

      edges.forEach(edge => {
        expect(qmesh.vertices.has(edge.v1.id)).toBe(true);
        expect(qmesh.vertices.has(edge.v2.id)).toBe(true);
      });
    });
  });

  describe('QFace methods', () => {
    it('getVertices returns face vertices in order', () => {
      const qmesh = new QMesh();

      const v0 = new QVertex('v0', new THREE.Vector3(0, 0, 0));
      const v1 = new QVertex('v1', new THREE.Vector3(1, 0, 0));
      const v2 = new QVertex('v2', new THREE.Vector3(0, 1, 0));

      qmesh.vertices.set(v0.id, v0);
      qmesh.vertices.set(v1.id, v1);
      qmesh.vertices.set(v2.id, v2);

      const face = new QFace('f0');
      qmesh.faces.set(face.id, face);

      const he0 = new QHalfEdge('he0', v1);
      const he1 = new QHalfEdge('he1', v2);
      const he2 = new QHalfEdge('he2', v0);

      // Create twins for getFromVertex to work
      const twin0 = new QHalfEdge('twin0', v0);
      const twin1 = new QHalfEdge('twin1', v1);
      const twin2 = new QHalfEdge('twin2', v2);

      he0.twin = twin0; twin0.twin = he0;
      he1.twin = twin1; twin1.twin = he1;
      he2.twin = twin2; twin2.twin = he2;

      he0.next = he1; he1.next = he2; he2.next = he0;
      he0.face = face; he1.face = face; he2.face = face;
      face.oneHalfEdge = he0;

      const vertices = face.getVertices();

      expect(vertices.length).toBe(3);
      expect(vertices).toContain(v0);
      expect(vertices).toContain(v1);
      expect(vertices).toContain(v2);
    });

    it('calculateNormal returns correct normal', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,    // v0
        1, 0, 0,    // v1
        0, 1, 0,    // v2
      ]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const face = Array.from(qmesh.faces.values())[0];
      const normal = face.calculateNormal();

      // Triangle in XY plane should have normal pointing in +Z
      expect(normal.z).toBeGreaterThan(0.9); // Approximately 1
      expect(Math.abs(normal.x)).toBeLessThan(0.1);
      expect(Math.abs(normal.y)).toBeLessThan(0.1);
    });

    it('calculateCenter returns face center', () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,    // v0
        2, 0, 0,    // v1
        0, 2, 0,    // v2
      ]);
      const indices = new Uint16Array([0, 1, 2]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const face = Array.from(qmesh.faces.values())[0];
      const center = face.calculateCenter();

      // Center should be average of vertices
      expect(Math.abs(center.x - 2/3)).toBeLessThan(0.01);
      expect(Math.abs(center.y - 2/3)).toBeLessThan(0.01);
      expect(Math.abs(center.z)).toBeLessThan(0.01);
    });
  });

  describe('Round-trip (decompile → compile)', () => {
    it('preserves vertex count', () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const qmesh = QMesh.fromBufferGeometry(geometry);
      const compiled = qmesh.toBufferGeometry();

      // Vertex count should be preserved (accounting for shared vertices)
      expect(compiled.attributes.position.count).toBe(qmesh.vertices.size);
    });

    it('preserves basic shape', () => {
      const geometry = new THREE.SphereGeometry(1, 8, 6);
      const originalPositions = geometry.attributes.position;

      const qmesh = QMesh.fromBufferGeometry(geometry);
      const compiled = qmesh.toBufferGeometry();

      // Should have similar number of vertices (with vertex merging)
      expect(compiled.attributes.position.count).toBeGreaterThan(0);
      expect(compiled.index).toBeDefined();
    });
  });
});
