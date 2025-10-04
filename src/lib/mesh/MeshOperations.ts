/**
 * Mesh Operations Library
 *
 * Provides mesh editing operations like extrude, bevel, loop cut, etc.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import * as THREE from 'three';

export interface ExtrudeOptions {
  distance: number;
  divisions?: number;
  keepOriginalFaces?: boolean;
}

export interface BevelOptions {
  amount: number;
  segments?: number;
  profile?: number; // 0-1, shape of the bevel
}

export interface LoopCutOptions {
  position: number; // 0-1, position along the edge loop
  numberOfCuts?: number;
}

export class MeshOperations {
  /**
   * Extrude selected faces along their average normal
   */
  static extrudeFaces(
    geometry: THREE.BufferGeometry,
    selectedFaces: Set<number>,
    options: ExtrudeOptions
  ): void {
    const { distance = 1, divisions = 1, keepOriginalFaces = false } = options;

    if (!geometry.index) {
      console.warn('Extrude requires indexed geometry');
      return;
    }

    const positions = geometry.attributes.position;
    const index = geometry.index;
    const vertexCount = positions.count;

    // Step 1: Find unique vertices used by selected faces
    const verticesInSelection = new Set<number>();
    const faceVertices = new Map<number, number[]>(); // face index -> vertex indices

    selectedFaces.forEach(faceIndex => {
      const i = faceIndex * 3;
      const v0 = index.getX(i);
      const v1 = index.getX(i + 1);
      const v2 = index.getX(i + 2);

      verticesInSelection.add(v0);
      verticesInSelection.add(v1);
      verticesInSelection.add(v2);

      faceVertices.set(faceIndex, [v0, v1, v2]);
    });

    // Step 2: Calculate average normal for extrusion direction
    const averageNormal = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();

    selectedFaces.forEach(faceIndex => {
      const verts = faceVertices.get(faceIndex)!;
      v0.fromBufferAttribute(positions, verts[0]);
      v1.fromBufferAttribute(positions, verts[1]);
      v2.fromBufferAttribute(positions, verts[2]);

      // Calculate face normal using cross product
      v1.sub(v0);
      v2.sub(v0);
      faceNormal.crossVectors(v1, v2).normalize();
      averageNormal.add(faceNormal);
    });

    averageNormal.normalize();

    // Step 3: Create new vertices for extruded positions
    const newPositions: number[] = [];
    const oldToNewVertexMap = new Map<number, number>();
    let newVertexIndex = vertexCount;

    // Copy existing positions
    for (let i = 0; i < vertexCount; i++) {
      newPositions.push(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
    }

    // Create duplicated vertices at extruded positions
    verticesInSelection.forEach(oldIndex => {
      const x = positions.getX(oldIndex);
      const y = positions.getY(oldIndex);
      const z = positions.getZ(oldIndex);

      // Extrude along average normal
      newPositions.push(
        x + averageNormal.x * distance,
        y + averageNormal.y * distance,
        z + averageNormal.z * distance
      );

      oldToNewVertexMap.set(oldIndex, newVertexIndex);
      newVertexIndex++;
    });

    // Step 4: Create new faces
    const newIndices: number[] = [];
    const oldIndexArray = index.array;

    // Copy existing faces (excluding selected ones if not keeping them)
    for (let i = 0; i < oldIndexArray.length; i += 3) {
      const faceIndex = Math.floor(i / 3);

      if (!selectedFaces.has(faceIndex) || keepOriginalFaces) {
        newIndices.push(
          oldIndexArray[i],
          oldIndexArray[i + 1],
          oldIndexArray[i + 2]
        );
      }
    }

    // Add extruded top faces (using new vertices)
    selectedFaces.forEach(faceIndex => {
      const verts = faceVertices.get(faceIndex)!;
      newIndices.push(
        oldToNewVertexMap.get(verts[0])!,
        oldToNewVertexMap.get(verts[1])!,
        oldToNewVertexMap.get(verts[2])!
      );
    });

    // Step 5: Create side faces (connecting original and extruded vertices)
    const edgesProcessed = new Set<string>();

    selectedFaces.forEach(faceIndex => {
      const verts = faceVertices.get(faceIndex)!;

      // Process each edge of the face
      const edges = [
        [verts[0], verts[1]],
        [verts[1], verts[2]],
        [verts[2], verts[0]]
      ];

      edges.forEach(([v0, v1]) => {
        // Create a unique edge key (sorted to avoid duplicates)
        const edgeKey = v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;

        if (!edgesProcessed.has(edgeKey)) {
          edgesProcessed.add(edgeKey);

          // Check if this edge is on the boundary (not shared with another selected face)
          let isBoundaryEdge = true;
          selectedFaces.forEach(otherFaceIndex => {
            if (otherFaceIndex !== faceIndex) {
              const otherVerts = faceVertices.get(otherFaceIndex)!;
              const hasEdge =
                (otherVerts.includes(v0) && otherVerts.includes(v1));
              if (hasEdge) {
                isBoundaryEdge = false;
              }
            }
          });

          // Only create side faces for boundary edges
          if (isBoundaryEdge) {
            const nv0 = oldToNewVertexMap.get(v0)!;
            const nv1 = oldToNewVertexMap.get(v1)!;

            // Create two triangles for the quad side face
            newIndices.push(v0, v1, nv1);
            newIndices.push(v0, nv1, nv0);
          }
        }
      });
    });

    // Step 6: Update geometry with new data
    const newPositionAttribute = new THREE.Float32BufferAttribute(newPositions, 3);
    geometry.setAttribute('position', newPositionAttribute);

    const newIndexAttribute = new THREE.Uint32BufferAttribute(newIndices, 1);
    geometry.setIndex(newIndexAttribute);

    // Step 7: Update other attributes to match new vertex count
    const oldNormals = geometry.attributes.normal;
    const oldUvs = geometry.attributes.uv;

    // Update normals if they exist
    if (oldNormals) {
      const newNormals: number[] = [];
      // Copy existing normals
      for (let i = 0; i < vertexCount; i++) {
        newNormals.push(
          oldNormals.getX(i),
          oldNormals.getY(i),
          oldNormals.getZ(i)
        );
      }
      // Add normals for new vertices (will be recalculated)
      verticesInSelection.forEach(() => {
        newNormals.push(0, 1, 0); // Temporary normal, will be recalculated
      });
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    }

    // Update UVs if they exist
    if (oldUvs) {
      const newUvs: number[] = [];
      // Copy existing UVs
      for (let i = 0; i < vertexCount; i++) {
        newUvs.push(
          oldUvs.getX(i),
          oldUvs.getY(i)
        );
      }
      // Copy UVs for new vertices from their original counterparts
      verticesInSelection.forEach(oldIndex => {
        newUvs.push(
          oldUvs.getX(oldIndex),
          oldUvs.getY(oldIndex)
        );
      });
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
    }

    // Recalculate normals and bounds
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // Mark attributes as needing update
    geometry.attributes.position.needsUpdate = true;
    if (geometry.attributes.normal) geometry.attributes.normal.needsUpdate = true;
    if (geometry.attributes.uv) geometry.attributes.uv.needsUpdate = true;
  }

  /**
   * Inset faces (scale faces toward their center)
   */
  static insetFaces(
    geometry: THREE.BufferGeometry,
    selectedFaces: Set<number>,
    insetAmount: number
  ): void {
    if (!geometry.index) return;

    const positions = geometry.attributes.position;
    const index = geometry.index;

    selectedFaces.forEach(faceIndex => {
      const i = faceIndex * 3;
      const v0 = index.getX(i);
      const v1 = index.getX(i + 1);
      const v2 = index.getX(i + 2);

      // Calculate face center
      const center = new THREE.Vector3();
      center.x = (positions.getX(v0) + positions.getX(v1) + positions.getX(v2)) / 3;
      center.y = (positions.getY(v0) + positions.getY(v1) + positions.getY(v2)) / 3;
      center.z = (positions.getZ(v0) + positions.getZ(v1) + positions.getZ(v2)) / 3;

      // Move vertices toward center
      [v0, v1, v2].forEach(vIndex => {
        const pos = new THREE.Vector3(
          positions.getX(vIndex),
          positions.getY(vIndex),
          positions.getZ(vIndex)
        );

        pos.lerp(center, insetAmount);

        positions.setXYZ(vIndex, pos.x, pos.y, pos.z);
      });
    });

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Subdivide selected faces
   */
  static subdivideFaces(
    geometry: THREE.BufferGeometry,
    selectedFaces: Set<number>,
    divisions: number = 1
  ): void {
    // This is a placeholder for subdivision functionality
    // Full implementation would create new vertices and faces
    console.log('Subdivide faces not yet implemented');
  }

  /**
   * Add a loop cut across selected edge
   */
  static loopCut(
    geometry: THREE.BufferGeometry,
    selectedEdge: [number, number], // Two vertex indices defining the edge
    options: LoopCutOptions
  ): number[] {
    const { position = 0.5, numberOfCuts = 1 } = options;

    if (!geometry.index) {
      console.warn('Loop cut requires indexed geometry');
      return [];
    }

    const positions = geometry.attributes.position;
    const index = geometry.index;

    // Step 1: Find all edges parallel to the selected edge in the mesh
    const edgeRing = this.findEdgeRing(geometry, selectedEdge);

    if (edgeRing.length === 0) {
      console.warn('Could not find edge ring for loop cut');
      return [];
    }

    const newVertexIndices: number[] = [];

    // Step 2: For each cut, create new vertices and split edges
    for (let cutIndex = 0; cutIndex < numberOfCuts; cutIndex++) {
      const cutPosition = numberOfCuts === 1
        ? position
        : (cutIndex + 1) / (numberOfCuts + 1);

      const cutVertices: number[] = [];

      // Create new vertices along each edge in the ring
      edgeRing.forEach(([v0, v1]) => {
        const p0 = new THREE.Vector3(
          positions.getX(v0),
          positions.getY(v0),
          positions.getZ(v0)
        );
        const p1 = new THREE.Vector3(
          positions.getX(v1),
          positions.getY(v1),
          positions.getZ(v1)
        );

        // Interpolate position
        const newPos = p0.lerp(p1, cutPosition);
        const newVertexIndex = positions.count;

        // We'll rebuild the geometry with new vertices
        cutVertices.push(newVertexIndex);
      });

      newVertexIndices.push(...cutVertices);
    }

    // Step 3: Rebuild geometry with new vertices and faces
    this.rebuildGeometryWithLoopCut(geometry, edgeRing, newVertexIndices, position);

    return newVertexIndices;
  }

  /**
   * Find edge ring - edges parallel to the selected edge
   */
  private static findEdgeRing(
    geometry: THREE.BufferGeometry,
    edge: [number, number]
  ): Array<[number, number]> {
    const index = geometry.index!;
    const edgeRing: Array<[number, number]> = [];

    // Build adjacency map
    const edgeToFaces = new Map<string, number[]>();

    for (let i = 0; i < index.count; i += 3) {
      const v0 = index.getX(i);
      const v1 = index.getX(i + 1);
      const v2 = index.getX(i + 2);
      const faceIndex = i / 3;

      const edges = [
        [v0, v1], [v1, v2], [v2, v0]
      ];

      edges.forEach(([a, b]) => {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!edgeToFaces.has(key)) {
          edgeToFaces.set(key, []);
        }
        edgeToFaces.get(key)!.push(faceIndex);
      });
    }

    // Find edge loop by traversing parallel edges
    const [start0, start1] = edge;
    const startKey = start0 < start1 ? `${start0}-${start1}` : `${start1}-${start0}`;
    const visited = new Set<string>();
    const queue: Array<[number, number]> = [[start0, start1]];

    visited.add(startKey);
    edgeRing.push([start0, start1]);

    // Simple edge ring detection - in a real implementation,
    // this would follow the topology more carefully
    while (queue.length > 0) {
      const currentEdge = queue.shift()!;
      const key = currentEdge[0] < currentEdge[1]
        ? `${currentEdge[0]}-${currentEdge[1]}`
        : `${currentEdge[1]}-${currentEdge[0]}`;

      const faces = edgeToFaces.get(key) || [];

      // Find adjacent edges in the ring
      faces.forEach(faceIndex => {
        const i = faceIndex * 3;
        const v0 = index.getX(i);
        const v1 = index.getX(i + 1);
        const v2 = index.getX(i + 2);

        const faceEdges = [
          [v0, v1], [v1, v2], [v2, v0]
        ];

        faceEdges.forEach(([a, b]) => {
          const edgeKey = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (!visited.has(edgeKey) && edgeKey !== key) {
            visited.add(edgeKey);
            edgeRing.push([a, b]);
            queue.push([a, b]);
          }
        });
      });

      // Limit to prevent infinite loop
      if (edgeRing.length > 100) break;
    }

    return edgeRing.slice(0, 20); // Limit for practical purposes
  }

  /**
   * Rebuild geometry with loop cut vertices
   */
  private static rebuildGeometryWithLoopCut(
    geometry: THREE.BufferGeometry,
    edgeRing: Array<[number, number]>,
    newVertexIndices: number[],
    position: number
  ): void {
    // This is a simplified implementation
    // In production, this would properly split faces and create new topology
    console.log('Geometry rebuild with loop cut - simplified implementation');
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
  }

  /**
   * Bevel selected edges or vertices
   */
  static bevel(
    geometry: THREE.BufferGeometry,
    selectedElements: Set<number>, // Vertex or edge indices
    options: BevelOptions,
    elementType: 'vertex' | 'edge' = 'edge'
  ): void {
    const { amount = 0.1, segments = 1, profile = 0.5 } = options;

    if (!geometry.index) {
      console.warn('Bevel requires indexed geometry');
      return;
    }

    const positions = geometry.attributes.position;
    const index = geometry.index;
    const newPositions: number[] = [];
    const newIndices: number[] = [];

    // Copy existing positions
    for (let i = 0; i < positions.count; i++) {
      newPositions.push(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
    }

    if (elementType === 'edge') {
      // Bevel edges
      const edgeMap = new Map<string, [number, number]>();

      // Build edge map from selected indices (assuming they're edge indices)
      selectedElements.forEach(edgeIdx => {
        // In a real implementation, we'd have proper edge selection
        // For now, this is a simplified placeholder
      });

      // For each edge, create bevel geometry
      edgeMap.forEach(([v0, v1], edgeKey) => {
        const p0 = new THREE.Vector3(
          positions.getX(v0),
          positions.getY(v0),
          positions.getZ(v0)
        );
        const p1 = new THREE.Vector3(
          positions.getX(v1),
          positions.getY(v1),
          positions.getZ(v1)
        );

        // Calculate bevel direction (perpendicular to edge)
        const edgeDir = new THREE.Vector3().subVectors(p1, p0).normalize();

        // Create new vertices for bevel
        for (let seg = 0; seg <= segments; seg++) {
          const t = seg / segments;
          const bevelPos = new THREE.Vector3().lerpVectors(p0, p1, t);

          // Offset by bevel amount using profile curve
          const profileT = Math.pow(t, profile);
          const offset = amount * (1 - Math.abs(profileT - 0.5) * 2);

          // This is simplified - real bevel would calculate proper perpendicular
          bevelPos.y += offset;

          newPositions.push(bevelPos.x, bevelPos.y, bevelPos.z);
        }
      });
    } else {
      // Bevel vertices
      selectedElements.forEach(vIdx => {
        const pos = new THREE.Vector3(
          positions.getX(vIdx),
          positions.getY(vIdx),
          positions.getZ(vIdx)
        );

        // Find connected edges
        const connectedEdges: Array<[number, THREE.Vector3]> = [];

        for (let i = 0; i < index.count; i += 3) {
          const v0 = index.getX(i);
          const v1 = index.getX(i + 1);
          const v2 = index.getX(i + 2);

          if (v0 === vIdx || v1 === vIdx || v2 === vIdx) {
            // This vertex is part of this face
            const others = [v0, v1, v2].filter(v => v !== vIdx);
            others.forEach(other => {
              const otherPos = new THREE.Vector3(
                positions.getX(other),
                positions.getY(other),
                positions.getZ(other)
              );
              connectedEdges.push([other, otherPos]);
            });
          }
        }

        // Create bevel vertices around the original vertex
        connectedEdges.forEach(([otherIdx, otherPos]) => {
          const dir = new THREE.Vector3().subVectors(otherPos, pos).normalize();
          const bevelPos = pos.clone().add(dir.multiplyScalar(amount));
          newPositions.push(bevelPos.x, bevelPos.y, bevelPos.z);
        });
      });
    }

    // Update geometry (simplified - in production would rebuild topology)
    console.log('Bevel operation - simplified implementation');
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
  }

  /**
   * Bridge two edge loops
   */
  static bridgeEdgeLoops(
    geometry: THREE.BufferGeometry,
    edgeLoop1: Array<[number, number]>,
    edgeLoop2: Array<[number, number]>
  ): void {
    if (!geometry.index) {
      console.warn('Bridge requires indexed geometry');
      return;
    }

    if (edgeLoop1.length !== edgeLoop2.length) {
      console.warn('Edge loops must have same number of edges');
      return;
    }

    const positions = geometry.attributes.position;
    const newIndices: number[] = [];

    // Copy existing indices
    const oldIndices = Array.from(geometry.index.array);
    newIndices.push(...oldIndices);

    // Create faces connecting the two loops
    for (let i = 0; i < edgeLoop1.length; i++) {
      const [v0a, v1a] = edgeLoop1[i];
      const [v0b, v1b] = edgeLoop2[i];

      // Create two triangles to bridge the edge
      // Triangle 1: v0a, v1a, v0b
      newIndices.push(v0a, v1a, v0b);

      // Triangle 2: v1a, v1b, v0b
      newIndices.push(v1a, v1b, v0b);
    }

    // Update geometry index
    geometry.setIndex(new THREE.Uint32BufferAttribute(newIndices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    console.log(`Bridged ${edgeLoop1.length} edge pairs`);
  }
}