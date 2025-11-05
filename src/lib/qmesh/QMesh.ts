/**
 * QMesh - Half-Edge Data Structure
 *
 * This is the "source of truth" for all 3D mesh topology in Edit Mode.
 * It replaces the fragile BufferGeometry manipulation with a clean, graph-based approach.
 *
 * Architecture:
 * - QVertex: Represents a 3D point in space
 * - QFace: Represents a polygon (triangle, quad, or N-gon)
 * - QHalfEdge: Represents a directed edge, linking vertices and faces
 * - QMesh: The container that manages all of the above
 *
 * The QMesh is "compiled" to BufferGeometry for rendering, and "decompiled" from
 * BufferGeometry when loading existing meshes.
 */

import * as THREE from 'three';

/**
 * QVertex - A 3D vertex in the mesh
 */
export class QVertex {
  id: string;
  position: THREE.Vector3;
  oneOutgoingHalfEdge: QHalfEdge | null = null;

  constructor(id: string, position: THREE.Vector3) {
    this.id = id;
    this.position = position.clone();
  }
}

/**
 * QFace - A polygon face (can be triangle, quad, or N-gon)
 */
export class QFace {
  id: string;
  oneHalfEdge: QHalfEdge | null = null;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Get all vertices of this face by walking the half-edge loop
   */
  getVertices(): QVertex[] {
    if (!this.oneHalfEdge) return [];

    const vertices: QVertex[] = [];
    let current = this.oneHalfEdge;

    do {
      // The "from" vertex is the twin's toVertex
      if (current.twin) {
        vertices.push(current.twin.toVertex);
      }
      current = current.next!;
    } while (current && current !== this.oneHalfEdge);

    return vertices;
  }

  /**
   * Get all half-edges of this face
   */
  getHalfEdges(): QHalfEdge[] {
    if (!this.oneHalfEdge) return [];

    const halfEdges: QHalfEdge[] = [];
    let current = this.oneHalfEdge;

    do {
      halfEdges.push(current);
      current = current.next!;
    } while (current && current !== this.oneHalfEdge);

    return halfEdges;
  }

  /**
   * Calculate the normal of this face
   */
  calculateNormal(): THREE.Vector3 {
    const vertices = this.getVertices();
    if (vertices.length < 3) return new THREE.Vector3(0, 1, 0);

    // Use Newell's method for robust normal calculation
    const normal = new THREE.Vector3();
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i].position;
      const v2 = vertices[(i + 1) % vertices.length].position;

      normal.x += (v1.y - v2.y) * (v1.z + v2.z);
      normal.y += (v1.z - v2.z) * (v1.x + v2.x);
      normal.z += (v1.x - v2.x) * (v1.y + v2.y);
    }

    return normal.normalize();
  }

  /**
   * Calculate the center of this face
   */
  calculateCenter(): THREE.Vector3 {
    const vertices = this.getVertices();
    if (vertices.length === 0) return new THREE.Vector3();

    const center = new THREE.Vector3();
    vertices.forEach(v => center.add(v.position));
    center.divideScalar(vertices.length);

    return center;
  }
}

/**
 * QHalfEdge - A directed edge in the mesh
 */
export class QHalfEdge {
  id: string;
  toVertex: QVertex;
  face: QFace | null = null;
  next: QHalfEdge | null = null;
  prev: QHalfEdge | null = null;
  twin: QHalfEdge | null = null;

  constructor(id: string, toVertex: QVertex) {
    this.id = id;
    this.toVertex = toVertex;
  }

  /**
   * Get the "from" vertex (the twin's toVertex)
   */
  getFromVertex(): QVertex | null {
    return this.twin ? this.twin.toVertex : null;
  }

  /**
   * Get the edge as a normalized key for lookup (sorted vertex IDs)
   */
  getEdgeKey(): string {
    const fromVertex = this.getFromVertex();
    if (!fromVertex) return '';

    const ids = [fromVertex.id, this.toVertex.id].sort();
    return `${ids[0]}-${ids[1]}`;
  }
}

/**
 * QMesh - The main half-edge mesh structure
 */
export class QMesh {
  vertices: Map<string, QVertex> = new Map();
  faces: Map<string, QFace> = new Map();
  halfEdges: Map<string, QHalfEdge> = new Map();

  /**
   * Maps triangle index (in the compiled BufferGeometry) -> face ID
   * Critical for raycasting: when we hit a triangle, we need to know which QFace it belongs to
   */
  triangleFaceMap: Map<number, string> = new Map();

  constructor() {
    // Empty mesh
  }

  /**
   * DECOMPILER: Create a QMesh from a THREE.BufferGeometry
   * This is the most complex part - it must:
   * 1. Merge duplicate vertices at the same position
   * 2. Detect quads (pairs of coplanar triangles)
   * 3. Build the half-edge connectivity
   */
  static fromBufferGeometry(geometry: THREE.BufferGeometry): QMesh {
    const qMesh = new QMesh();

    const positions = geometry.attributes.position;
    const index = geometry.index;

    if (!positions) {
      console.warn('[QMesh] No position attribute found');
      return qMesh;
    }

    // Step 1: Create vertices (with merging)
    // Build a map of position -> vertex ID for merging
    const positionToVertexId = new Map<string, string>();
    const precision = 4; // Decimal places for position key

    const getPositionKey = (x: number, y: number, z: number): string => {
      return `${x.toFixed(precision)},${y.toFixed(precision)},${z.toFixed(precision)}`;
    };

    const getOrCreateVertex = (x: number, y: number, z: number): QVertex => {
      const key = getPositionKey(x, y, z);
      let vertexId = positionToVertexId.get(key);

      if (!vertexId) {
        vertexId = `v_${qMesh.vertices.size}`;
        const vertex = new QVertex(vertexId, new THREE.Vector3(x, y, z));
        qMesh.vertices.set(vertexId, vertex);
        positionToVertexId.set(key, vertexId);
      }

      return qMesh.vertices.get(vertexId)!;
    };

    // Step 2: Build triangles and detect quads
    const triangleCount = index ? index.count / 3 : positions.count / 3;
    const triangles: Array<{
      index: number;
      vertices: QVertex[];
      used: boolean;
    }> = [];

    // Extract all triangles
    for (let i = 0; i < triangleCount; i++) {
      const i0 = index ? index.getX(i * 3) : i * 3;
      const i1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const i2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;

      const v0 = getOrCreateVertex(
        positions.getX(i0),
        positions.getY(i0),
        positions.getZ(i0)
      );
      const v1 = getOrCreateVertex(
        positions.getX(i1),
        positions.getY(i1),
        positions.getZ(i1)
      );
      const v2 = getOrCreateVertex(
        positions.getX(i2),
        positions.getY(i2),
        positions.getZ(i2)
      );

      triangles.push({
        index: i,
        vertices: [v0, v1, v2],
        used: false,
      });
    }

    // Step 3: Detect quads (adapted from QuadDetection.ts)
    const findQuadPair = (triangleIdx: number): number | null => {
      const tri = triangles[triangleIdx];
      const triVertexIds = new Set(tri.vertices.map(v => v.id));

      for (let j = 0; j < triangles.length; j++) {
        if (j === triangleIdx || triangles[j].used) continue;

        const otherTri = triangles[j];
        const otherVertexIds = otherTri.vertices.map(v => v.id);

        // Count shared vertices
        const sharedCount = otherVertexIds.filter(id => triVertexIds.has(id)).length;

        if (sharedCount === 2) {
          // Check if they form a quad (4 unique vertices total)
          const allVertexIds = new Set([
            ...tri.vertices.map(v => v.id),
            ...otherTri.vertices.map(v => v.id),
          ]);

          if (allVertexIds.size === 4) {
            return j; // Found quad pair
          }
        }
      }

      return null; // No quad pair
    };

    // Step 4: Create faces (quads and standalone triangles)
    let faceCounter = 0;
    let heCounter = 0;

    for (let i = 0; i < triangles.length; i++) {
      if (triangles[i].used) continue;

      const pairIdx = findQuadPair(i);

      if (pairIdx !== null) {
        // This is a quad!
        const tri1 = triangles[i];
        const tri2 = triangles[pairIdx];

        // Mark both as used
        tri1.used = true;
        tri2.used = true;

        // Find the 4 unique vertices in correct order
        const quadVertices = this.orderQuadVertices(tri1.vertices, tri2.vertices);

        // Create a QFace for the quad
        const faceId = `f_${faceCounter++}`;
        const face = new QFace(faceId);
        qMesh.faces.set(faceId, face);

        // Create half-edges for the quad
        const halfEdges: QHalfEdge[] = [];
        for (let j = 0; j < quadVertices.length; j++) {
          const fromVertex = quadVertices[j];
          const toVertex = quadVertices[(j + 1) % quadVertices.length];

          const he = new QHalfEdge(`he_${heCounter++}`, toVertex);
          he.face = face;

          // Link to vertex
          if (!fromVertex.oneOutgoingHalfEdge) {
            fromVertex.oneOutgoingHalfEdge = he;
          }

          qMesh.halfEdges.set(he.id, he);
          halfEdges.push(he);
        }

        // Link next/prev
        for (let j = 0; j < halfEdges.length; j++) {
          halfEdges[j].next = halfEdges[(j + 1) % halfEdges.length];
          halfEdges[j].prev = halfEdges[(j - 1 + halfEdges.length) % halfEdges.length];
        }

        face.oneHalfEdge = halfEdges[0];
      } else {
        // Standalone triangle
        const tri = triangles[i];
        tri.used = true;

        const faceId = `f_${faceCounter++}`;
        const face = new QFace(faceId);
        qMesh.faces.set(faceId, face);

        // Create half-edges for the triangle
        const halfEdges: QHalfEdge[] = [];
        for (let j = 0; j < 3; j++) {
          const fromVertex = tri.vertices[j];
          const toVertex = tri.vertices[(j + 1) % 3];

          const he = new QHalfEdge(`he_${heCounter++}`, toVertex);
          he.face = face;

          if (!fromVertex.oneOutgoingHalfEdge) {
            fromVertex.oneOutgoingHalfEdge = he;
          }

          qMesh.halfEdges.set(he.id, he);
          halfEdges.push(he);
        }

        // Link next/prev
        for (let j = 0; j < 3; j++) {
          halfEdges[j].next = halfEdges[(j + 1) % 3];
          halfEdges[j].prev = halfEdges[(j - 1 + 3) % 3];
        }

        face.oneHalfEdge = halfEdges[0];
      }
    }

    // Step 5: Link twin half-edges
    qMesh.linkTwins();

    console.log(`[QMesh] Decompiled: ${qMesh.vertices.size} vertices, ${qMesh.faces.size} faces, ${qMesh.halfEdges.size} half-edges`);

    return qMesh;
  }

  /**
   * Helper: Order quad vertices correctly from two triangles
   * This ensures the quad vertices are in a proper loop order
   */
  private static orderQuadVertices(tri1: QVertex[], tri2: QVertex[]): QVertex[] {
    // Find the 2 shared vertices
    const tri1Ids = new Set(tri1.map(v => v.id));
    const tri2Ids = new Set(tri2.map(v => v.id));

    const sharedVertices = tri1.filter(v => tri2Ids.has(v.id));
    const tri1UniqueVertex = tri1.find(v => !tri2Ids.has(v.id))!;
    const tri2UniqueVertex = tri2.find(v => !tri1Ids.has(v.id))!;

    // Order: unique1, shared1, unique2, shared2
    // This forms a proper quad loop
    return [
      tri1UniqueVertex,
      sharedVertices[0],
      tri2UniqueVertex,
      sharedVertices[1],
    ];
  }

  /**
   * Link twin half-edges by finding matching edges in opposite directions
   */
  private linkTwins(): void {
    // Build a map of (fromVertexId, toVertexId) -> HalfEdge
    const edgeMap = new Map<string, QHalfEdge>();

    this.halfEdges.forEach(he => {
      const fromVertex = he.twin?.toVertex || he.getFromVertex();
      if (!fromVertex) return;

      const key = `${fromVertex.id}->${he.toVertex.id}`;
      edgeMap.set(key, he);
    });

    // Find twins
    this.halfEdges.forEach(he => {
      if (he.twin) return; // Already linked

      const fromVertex = he.getFromVertex();
      if (!fromVertex) return;

      // Look for the opposite edge
      const oppositeKey = `${he.toVertex.id}->${fromVertex.id}`;
      const twin = edgeMap.get(oppositeKey);

      if (twin) {
        he.twin = twin;
        twin.twin = he;
      }
    });
  }

  /**
   * COMPILER: Convert this QMesh to a THREE.BufferGeometry for rendering
   * This generates the triangle soup and updates the triangleFaceMap
   */
  toBufferGeometry(): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Build vertex index map (QVertex.id -> buffer index)
    const vertexToBufferIndex = new Map<string, number>();
    let bufferIndex = 0;

    // First pass: add all vertices
    this.vertices.forEach(vertex => {
      vertexToBufferIndex.set(vertex.id, bufferIndex++);
      positions.push(vertex.position.x, vertex.position.y, vertex.position.z);

      // UVs: TODO - proper UV unwrapping
      uvs.push(0, 0);
    });

    // Clear and rebuild triangleFaceMap
    this.triangleFaceMap.clear();
    let triangleIndex = 0;

    // Second pass: triangulate faces
    this.faces.forEach(face => {
      const vertices = face.getVertices();
      if (vertices.length < 3) {
        console.warn(`[QMesh] Face ${face.id} has less than 3 vertices`);
        return;
      }

      // Triangulate the face using fan triangulation
      // TODO: Use proper ear-clipping for non-convex polygons
      const triangulatedIndices = this.triangulateFace(vertices);

      // Add triangles to index buffer
      for (let i = 0; i < triangulatedIndices.length; i += 3) {
        const v0Idx = vertexToBufferIndex.get(triangulatedIndices[i].id)!;
        const v1Idx = vertexToBufferIndex.get(triangulatedIndices[i + 1].id)!;
        const v2Idx = vertexToBufferIndex.get(triangulatedIndices[i + 2].id)!;

        indices.push(v0Idx, v1Idx, v2Idx);

        // Map this triangle to the face
        this.triangleFaceMap.set(triangleIndex++, face.id);
      }
    });

    // Create BufferGeometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    // Compute normals
    geometry.computeVertexNormals();

    console.log(`[QMesh] Compiled: ${positions.length / 3} vertices, ${indices.length / 3} triangles, ${this.faces.size} faces`);

    return geometry;
  }

  /**
   * Triangulate a face using fan triangulation
   * Returns array of vertices in triangulated order
   */
  private triangulateFace(vertices: QVertex[]): QVertex[] {
    if (vertices.length === 3) {
      // Already a triangle
      return vertices;
    }

    // Fan triangulation from first vertex
    const triangulated: QVertex[] = [];
    for (let i = 1; i < vertices.length - 1; i++) {
      triangulated.push(vertices[0], vertices[i], vertices[i + 1]);
    }

    return triangulated;
  }

  /**
   * MESH OPERATION: Extrude faces
   * This is the clean, graph-based version of the old extrudeFaces
   */
  extrudeFaces(faceIds: string[], distance: number): { newFaceIds: string[] } {
    const newFaceIds: string[] = [];

    // For each face to extrude
    faceIds.forEach(faceId => {
      const face = this.faces.get(faceId);
      if (!face) return;

      const vertices = face.getVertices();
      const normal = face.calculateNormal();

      // Create new vertices at extruded positions
      const newVertices: QVertex[] = [];
      vertices.forEach(oldVertex => {
        const newPos = oldVertex.position.clone().addScaledVector(normal, distance);
        const newVertexId = `v_${this.vertices.size}`;
        const newVertex = new QVertex(newVertexId, newPos);
        this.vertices.set(newVertexId, newVertex);
        newVertices.push(newVertex);
      });

      // Create the top face (extruded face)
      const topFaceId = `f_${this.faces.size}`;
      const topFace = new QFace(topFaceId);
      this.faces.set(topFaceId, topFace);
      newFaceIds.push(topFaceId);

      // Create half-edges for top face
      const topHalfEdges: QHalfEdge[] = [];
      for (let i = 0; i < newVertices.length; i++) {
        const fromVertex = newVertices[i];
        const toVertex = newVertices[(i + 1) % newVertices.length];

        const heId = `he_${this.halfEdges.size}`;
        const he = new QHalfEdge(heId, toVertex);
        he.face = topFace;
        this.halfEdges.set(heId, he);
        topHalfEdges.push(he);

        if (!fromVertex.oneOutgoingHalfEdge) {
          fromVertex.oneOutgoingHalfEdge = he;
        }
      }

      // Link next/prev for top face
      for (let i = 0; i < topHalfEdges.length; i++) {
        topHalfEdges[i].next = topHalfEdges[(i + 1) % topHalfEdges.length];
        topHalfEdges[i].prev = topHalfEdges[(i - 1 + topHalfEdges.length) % topHalfEdges.length];
      }

      topFace.oneHalfEdge = topHalfEdges[0];

      // Create side faces (connecting old vertices to new vertices)
      for (let i = 0; i < vertices.length; i++) {
        const v0 = vertices[i];
        const v1 = vertices[(i + 1) % vertices.length];
        const v2 = newVertices[(i + 1) % newVertices.length];
        const v3 = newVertices[i];

        // Create a quad face for the side
        const sideFaceId = `f_${this.faces.size}`;
        const sideFace = new QFace(sideFaceId);
        this.faces.set(sideFaceId, sideFace);
        newFaceIds.push(sideFaceId);

        // Create half-edges: v0 -> v1 -> v2 -> v3 -> v0
        const sideVertices = [v0, v1, v2, v3];
        const sideHalfEdges: QHalfEdge[] = [];

        for (let j = 0; j < 4; j++) {
          const fromVertex = sideVertices[j];
          const toVertex = sideVertices[(j + 1) % 4];

          const heId = `he_${this.halfEdges.size}`;
          const he = new QHalfEdge(heId, toVertex);
          he.face = sideFace;
          this.halfEdges.set(heId, he);
          sideHalfEdges.push(he);

          if (!fromVertex.oneOutgoingHalfEdge) {
            fromVertex.oneOutgoingHalfEdge = he;
          }
        }

        // Link next/prev
        for (let j = 0; j < 4; j++) {
          sideHalfEdges[j].next = sideHalfEdges[(j + 1) % 4];
          sideHalfEdges[j].prev = sideHalfEdges[(j - 1 + 4) % 4];
        }

        sideFace.oneHalfEdge = sideHalfEdges[0];
      }

      // Delete the original face
      this.faces.delete(faceId);
    });

    // Relink twins
    this.linkTwins();

    return { newFaceIds };
  }

  /**
   * Get all edges as an array of { v1: QVertex, v2: QVertex }
   */
  getEdges(): Array<{ v1: QVertex; v2: QVertex; edgeKey: string }> {
    const edges: Array<{ v1: QVertex; v2: QVertex; edgeKey: string }> = [];
    const seenEdges = new Set<string>();

    this.halfEdges.forEach(he => {
      const edgeKey = he.getEdgeKey();
      if (edgeKey && !seenEdges.has(edgeKey)) {
        const fromVertex = he.getFromVertex();
        if (fromVertex) {
          edges.push({
            v1: fromVertex,
            v2: he.toVertex,
            edgeKey,
          });
          seenEdges.add(edgeKey);
        }
      }
    });

    return edges;
  }
}
