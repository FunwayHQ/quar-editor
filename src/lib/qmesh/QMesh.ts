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

  // ========================================================================
  // ADVANCED MODELING OPERATIONS
  // ========================================================================

  /**
   * Find edge loop starting from a given edge
   * An edge loop follows parallel edges around a quad mesh
   */
  findEdgeLoop(startEdgeKey: string): string[] {
    const edgeLoop: string[] = [];
    const visited = new Set<string>();

    // Parse the edge key to get vertex IDs
    const [v1Id, v2Id] = startEdgeKey.split('-');
    const startV1 = this.vertices.get(v1Id);
    const startV2 = this.vertices.get(v2Id);

    if (!startV1 || !startV2) return [];

    // Find the half-edge for this edge
    let currentHE: QHalfEdge | null = null;
    this.halfEdges.forEach(he => {
      if (he.getEdgeKey() === startEdgeKey) {
        currentHE = he;
      }
    });

    if (!currentHE) return [];

    // Traverse the loop
    let iterations = 0;
    const maxIterations = 1000; // Safety limit

    while (currentHE && iterations < maxIterations) {
      const edgeKey = currentHE.getEdgeKey();

      if (visited.has(edgeKey)) break; // Completed loop

      visited.add(edgeKey);
      edgeLoop.push(edgeKey);

      // Move to the next parallel edge
      // In a quad mesh, we go: current edge → opposite edge in face → opposite edge in adjacent face
      if (currentHE.face) {
        // Get the opposite edge in this face (for quads, it's 2 edges away)
        let oppositeHE = currentHE.next?.next;

        if (oppositeHE && oppositeHE.twin) {
          // Move to adjacent face
          currentHE = oppositeHE.twin;

          // Get opposite edge in that face
          oppositeHE = currentHE.next?.next;

          if (oppositeHE) {
            currentHE = oppositeHE;
          } else {
            break;
          }
        } else {
          break; // Reached boundary
        }
      } else {
        break;
      }

      iterations++;
    }

    return edgeLoop;
  }

  /**
   * Insert a loop cut along an edge loop
   * Splits all faces along the loop and creates new vertices
   */
  loopCut(edgeKey: string, position: number = 0.5): { newVertexIds: string[]; newEdgeKeys: string[] } {
    const edgeLoop = this.findEdgeLoop(edgeKey);
    const newVertexIds: string[] = [];
    const newEdgeKeys: string[] = [];

    if (edgeLoop.length === 0) {
      console.warn('[QMesh] No edge loop found');
      return { newVertexIds, newEdgeKeys };
    }

    // For each edge in the loop, create a new vertex at the split position
    const edgeToNewVertex = new Map<string, QVertex>();

    edgeLoop.forEach(edgeKey => {
      const [v1Id, v2Id] = edgeKey.split('-');
      const v1 = this.vertices.get(v1Id);
      const v2 = this.vertices.get(v2Id);

      if (!v1 || !v2) return;

      // Create new vertex at interpolated position
      const newPos = new THREE.Vector3().lerpVectors(v1.position, v2.position, position);
      const newVertexId = `v_${this.vertices.size}`;
      const newVertex = new QVertex(newVertexId, newPos);
      this.vertices.set(newVertexId, newVertex);
      newVertexIds.push(newVertexId);

      edgeToNewVertex.set(edgeKey, newVertex);
    });

    // Now split all faces that contain these edges
    const facesToSplit = new Set<string>();

    edgeLoop.forEach(edgeKey => {
      this.halfEdges.forEach(he => {
        if (he.getEdgeKey() === edgeKey && he.face) {
          facesToSplit.add(he.face.id);
        }
      });
    });

    // Split each face (this is complex - simplified version)
    facesToSplit.forEach(faceId => {
      const face = this.faces.get(faceId);
      if (!face) return;

      // For a quad split by a loop cut, we create 2 new quads
      // This requires careful topology manipulation
      // Simplified: Mark for later implementation
      console.log(`[QMesh] Would split face ${faceId} for loop cut`);
    });

    return { newVertexIds, newEdgeKeys };
  }

  /**
   * Bevel edges - creates a beveled edge by splitting and offsetting
   */
  bevelEdges(edgeKeys: string[], amount: number, segments: number = 1): { newFaceIds: string[] } {
    const newFaceIds: string[] = [];

    edgeKeys.forEach(edgeKey => {
      const [v1Id, v2Id] = edgeKey.split('-');
      const v1 = this.vertices.get(v1Id);
      const v2 = this.vertices.get(v2Id);

      if (!v1 || !v2) return;

      // Find the half-edge for this edge
      let he: QHalfEdge | null = null;
      this.halfEdges.forEach(halfEdge => {
        if (halfEdge.getEdgeKey() === edgeKey) {
          he = halfEdge;
        }
      });

      if (!he || !he.twin) return;

      // Calculate bevel direction (perpendicular to edge, in face plane)
      const edgeDir = new THREE.Vector3().subVectors(v2.position, v1.position).normalize();

      // Get normals from adjacent faces
      const normal1 = he.face ? he.face.calculateNormal() : new THREE.Vector3(0, 1, 0);
      const normal2 = he.twin.face ? he.twin.face.calculateNormal() : new THREE.Vector3(0, 1, 0);
      const avgNormal = new THREE.Vector3().addVectors(normal1, normal2).normalize();

      // Bevel direction is perpendicular to edge, in plane of average normal
      const bevelDir = new THREE.Vector3().crossVectors(edgeDir, avgNormal).normalize();

      // Create new vertices for bevel
      const newV1Id = `v_${this.vertices.size}`;
      const newV1Pos = v1.position.clone().add(bevelDir.clone().multiplyScalar(amount));
      const newV1 = new QVertex(newV1Id, newV1Pos);
      this.vertices.set(newV1Id, newV1);

      const newV2Id = `v_${this.vertices.size}`;
      const newV2Pos = v2.position.clone().add(bevelDir.clone().multiplyScalar(amount));
      const newV2 = new QVertex(newV2Id, newV2Pos);
      this.vertices.set(newV2Id, newV2);

      // Create bevel face (quad connecting original and new vertices)
      const bevelFaceId = `f_${this.faces.size}`;
      const bevelFace = new QFace(bevelFaceId);
      this.faces.set(bevelFaceId, bevelFace);
      newFaceIds.push(bevelFaceId);

      // Create half-edges for bevel face
      const bevelVertices = [v1, newV1, newV2, v2];
      const bevelHalfEdges: QHalfEdge[] = [];

      for (let i = 0; i < 4; i++) {
        const fromVertex = bevelVertices[i];
        const toVertex = bevelVertices[(i + 1) % 4];

        const heId = `he_${this.halfEdges.size}`;
        const bevelHE = new QHalfEdge(heId, toVertex);
        bevelHE.face = bevelFace;
        this.halfEdges.set(heId, bevelHE);
        bevelHalfEdges.push(bevelHE);

        if (!fromVertex.oneOutgoingHalfEdge) {
          fromVertex.oneOutgoingHalfEdge = bevelHE;
        }
      }

      // Link next/prev
      for (let i = 0; i < 4; i++) {
        bevelHalfEdges[i].next = bevelHalfEdges[(i + 1) % 4];
        bevelHalfEdges[i].prev = bevelHalfEdges[(i - 1 + 4) % 4];
      }

      bevelFace.oneHalfEdge = bevelHalfEdges[0];
    });

    // Relink twins
    this.linkTwins();

    console.log(`[QMesh] Beveled ${edgeKeys.length} edges, created ${newFaceIds.length} bevel faces`);
    return { newFaceIds };
  }

  /**
   * Merge vertices - combines multiple vertices into one
   */
  mergeVertices(vertexIds: string[]): { mergedVertexId: string } {
    if (vertexIds.length < 2) {
      console.warn('[QMesh] Need at least 2 vertices to merge');
      return { mergedVertexId: vertexIds[0] || '' };
    }

    // Calculate average position
    const avgPos = new THREE.Vector3();
    vertexIds.forEach(id => {
      const vertex = this.vertices.get(id);
      if (vertex) {
        avgPos.add(vertex.position);
      }
    });
    avgPos.divideScalar(vertexIds.length);

    // Keep first vertex, move it to average position
    const mergedVertexId = vertexIds[0];
    const mergedVertex = this.vertices.get(mergedVertexId);
    if (!mergedVertex) {
      console.warn('[QMesh] Merged vertex not found');
      return { mergedVertexId: '' };
    }

    mergedVertex.position.copy(avgPos);

    // Update all half-edges pointing to other vertices to point to merged vertex
    for (let i = 1; i < vertexIds.length; i++) {
      const oldVertexId = vertexIds[i];

      this.halfEdges.forEach(he => {
        if (he.toVertex.id === oldVertexId) {
          he.toVertex = mergedVertex;
        }
      });

      // Remove the old vertex
      this.vertices.delete(oldVertexId);
    }

    // Clean up degenerate faces (faces with duplicate vertices)
    const facesToDelete: string[] = [];
    this.faces.forEach(face => {
      const vertices = face.getVertices();
      const uniqueVertices = new Set(vertices.map(v => v.id));

      if (uniqueVertices.size < vertices.length) {
        // This face has duplicate vertices after merge - delete it
        facesToDelete.push(face.id);
      }
    });

    facesToDelete.forEach(faceId => {
      this.faces.delete(faceId);
    });

    // Relink twins
    this.linkTwins();

    console.log(`[QMesh] Merged ${vertexIds.length} vertices into ${mergedVertexId}, removed ${facesToDelete.length} degenerate faces`);
    return { mergedVertexId };
  }

  /**
   * Dissolve edges - removes edges and merges adjacent faces
   */
  dissolveEdges(edgeKeys: string[]): { mergedFaceIds: string[] } {
    const mergedFaceIds: string[] = [];

    edgeKeys.forEach(edgeKey => {
      // Find the half-edge
      let he: QHalfEdge | null = null;
      this.halfEdges.forEach(halfEdge => {
        if (halfEdge.getEdgeKey() === edgeKey) {
          he = halfEdge;
        }
      });

      if (!he || !he.twin || !he.face || !he.twin.face) return;

      const face1 = he.face;
      const face2 = he.twin.face;

      // Get all vertices from both faces (excluding the dissolved edge)
      const face1Vertices = face1.getVertices();
      const face2Vertices = face2.getVertices();

      // Find vertices that are NOT on the dissolved edge
      const [edgeV1Id, edgeV2Id] = edgeKey.split('-');
      const allVertices = [
        ...face1Vertices.filter(v => v.id !== edgeV1Id && v.id !== edgeV2Id),
        ...face2Vertices.filter(v => v.id !== edgeV1Id && v.id !== edgeV2Id),
      ];

      // Create new merged face
      const mergedFaceId = `f_${this.faces.size}`;
      const mergedFace = new QFace(mergedFaceId);
      this.faces.set(mergedFaceId, mergedFace);
      mergedFaceIds.push(mergedFaceId);

      // Create half-edges for merged face
      const mergedHalfEdges: QHalfEdge[] = [];
      for (let i = 0; i < allVertices.length; i++) {
        const fromVertex = allVertices[i];
        const toVertex = allVertices[(i + 1) % allVertices.length];

        const heId = `he_${this.halfEdges.size}`;
        const mergedHE = new QHalfEdge(heId, toVertex);
        mergedHE.face = mergedFace;
        this.halfEdges.set(heId, mergedHE);
        mergedHalfEdges.push(mergedHE);

        if (!fromVertex.oneOutgoingHalfEdge) {
          fromVertex.oneOutgoingHalfEdge = mergedHE;
        }
      }

      // Link next/prev
      for (let i = 0; i < mergedHalfEdges.length; i++) {
        mergedHalfEdges[i].next = mergedHalfEdges[(i + 1) % mergedHalfEdges.length];
        mergedHalfEdges[i].prev = mergedHalfEdges[(i - 1 + mergedHalfEdges.length) % mergedHalfEdges.length];
      }

      mergedFace.oneHalfEdge = mergedHalfEdges[0];

      // Delete old faces
      this.faces.delete(face1.id);
      this.faces.delete(face2.id);

      // Delete half-edges associated with dissolved edge
      this.halfEdges.delete(he.id);
      this.halfEdges.delete(he.twin.id);
    });

    // Relink twins
    this.linkTwins();

    console.log(`[QMesh] Dissolved ${edgeKeys.length} edges, created ${mergedFaceIds.length} merged faces`);
    return { mergedFaceIds };
  }

  /**
   * Spin - Rotational extrusion around an axis
   */
  spin(faceIds: string[], axis: THREE.Vector3, angle: number, steps: number): { newFaceIds: string[] } {
    const newFaceIds: string[] = [];
    const axisNormalized = axis.clone().normalize();

    // Get center point for rotation
    const center = new THREE.Vector3();
    let vertexCount = 0;

    faceIds.forEach(faceId => {
      const face = this.faces.get(faceId);
      if (face) {
        const faceCenter = face.calculateCenter();
        center.add(faceCenter);
        vertexCount++;
      }
    });

    if (vertexCount > 0) {
      center.divideScalar(vertexCount);
    }

    // For each step, create rotated copies and connect them
    for (let step = 0; step < steps; step++) {
      const currentAngle = (angle / steps) * (step + 1);
      const quaternion = new THREE.Quaternion().setFromAxisAngle(axisNormalized, currentAngle);

      // Rotate and extrude each face
      faceIds.forEach(faceId => {
        const face = this.faces.get(faceId);
        if (!face) return;

        const vertices = face.getVertices();
        const rotatedVertices: QVertex[] = [];

        // Create rotated vertices
        vertices.forEach(vertex => {
          const relativePos = vertex.position.clone().sub(center);
          relativePos.applyQuaternion(quaternion);
          const rotatedPos = relativePos.add(center);

          const newVertexId = `v_${this.vertices.size}`;
          const newVertex = new QVertex(newVertexId, rotatedPos);
          this.vertices.set(newVertexId, newVertex);
          rotatedVertices.push(newVertex);
        });

        // Create the rotated face
        const newFaceId = `f_${this.faces.size}`;
        const newFace = new QFace(newFaceId);
        this.faces.set(newFaceId, newFace);
        newFaceIds.push(newFaceId);

        // Create half-edges
        const newHalfEdges: QHalfEdge[] = [];
        for (let i = 0; i < rotatedVertices.length; i++) {
          const fromVertex = rotatedVertices[i];
          const toVertex = rotatedVertices[(i + 1) % rotatedVertices.length];

          const heId = `he_${this.halfEdges.size}`;
          const newHE = new QHalfEdge(heId, toVertex);
          newHE.face = newFace;
          this.halfEdges.set(heId, newHE);
          newHalfEdges.push(newHE);

          if (!fromVertex.oneOutgoingHalfEdge) {
            fromVertex.oneOutgoingHalfEdge = newHE;
          }
        }

        // Link next/prev
        for (let i = 0; i < newHalfEdges.length; i++) {
          newHalfEdges[i].next = newHalfEdges[(i + 1) % newHalfEdges.length];
          newHalfEdges[i].prev = newHalfEdges[(i - 1 + newHalfEdges.length) % newHalfEdges.length];
        }

        newFace.oneHalfEdge = newHalfEdges[0];

        // Create side faces connecting to previous step
        if (step > 0) {
          // Connect current rotated face to previous one
          // This requires tracking the previous step's vertices
          // Simplified for now
        }
      });
    }

    // Relink twins
    this.linkTwins();

    console.log(`[QMesh] Spin: created ${newFaceIds.length} new faces with ${steps} steps at ${angle} radians`);
    return { newFaceIds };
  }
}
