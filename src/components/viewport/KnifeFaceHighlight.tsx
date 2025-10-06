/**
 * Knife Face Highlight Component
 *
 * Highlights the selected face's edges for knife tool
 * Shows only edges of the target face after first point
 * Sprint Y: Shows quad outer edges (no diagonals) when in quad mode
 */

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { findQuadPair } from '../../lib/geometry/QuadDetection';
import { useKnifeToolStore } from '../../stores/knifeToolStore';

interface KnifeFaceHighlightProps {
  geometry: THREE.BufferGeometry;
  faceIndex: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export function KnifeFaceHighlight({
  geometry,
  faceIndex,
  position,
  rotation,
  scale,
}: KnifeFaceHighlightProps) {
  const { cutMode } = useKnifeToolStore();
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Create geometry showing edges (Sprint Y: quad-aware)
  const faceGeometry = useMemo(() => {
    // Dispose previous geometry to prevent memory leak
    if (geometryRef.current) {
      geometryRef.current.dispose();
      geometryRef.current = null;
    }
    const indices = geometry.index;
    const positions = geometry.attributes.position;

    if (!indices) return null;

    // Sprint Y: In quad mode, show only outer edges (no diagonal)
    if (cutMode === 'quad') {
      const quadPair = findQuadPair(faceIndex, geometry);

      console.log(`[KnifeFaceHighlight] Quad mode - face ${faceIndex}, pair: ${quadPair}`);

      if (quadPair !== null) {
        // This is part of a quad - show 4 outer edges only
        const i1 = faceIndex * 3;
        const i2 = quadPair * 3;

        // Get all 6 vertices (3 per triangle)
        const face1Vertices = [
          indices.getX(i1),
          indices.getX(i1 + 1),
          indices.getX(i1 + 2),
        ];

        const face2Vertices = [
          indices.getX(i2),
          indices.getX(i2 + 1),
          indices.getX(i2 + 2),
        ];

        // Find the 2 shared vertices (the diagonal)
        const sharedVertices = face1Vertices.filter(v => face2Vertices.includes(v));

        // Find the 4 unique vertices (the quad corners)
        const allVertices = new Set([...face1Vertices, ...face2Vertices]);

        // Build only the outer edges (skip the diagonal)
        const edgePositions: number[] = [];

        // Helper to add edge if it's not the diagonal
        const addEdgeIfOuter = (v1: number, v2: number) => {
          // Edge is outer if it's not composed of both shared vertices
          const isDiagonal = sharedVertices.includes(v1) && sharedVertices.includes(v2);
          if (!isDiagonal) {
            edgePositions.push(
              positions.getX(v1), positions.getY(v1), positions.getZ(v1),
              positions.getX(v2), positions.getY(v2), positions.getZ(v2)
            );
          }
        };

        // Add edges from face 1
        addEdgeIfOuter(face1Vertices[0], face1Vertices[1]);
        addEdgeIfOuter(face1Vertices[1], face1Vertices[2]);
        addEdgeIfOuter(face1Vertices[2], face1Vertices[0]);

        // Add edges from face 2
        addEdgeIfOuter(face2Vertices[0], face2Vertices[1]);
        addEdgeIfOuter(face2Vertices[1], face2Vertices[2]);
        addEdgeIfOuter(face2Vertices[2], face2Vertices[0]);

        console.log(`[KnifeFaceHighlight] Quad edges - total: ${edgePositions.length / 6} edges, shared verts: ${sharedVertices.join(',')}`);

        const edgeGeo = new THREE.BufferGeometry();
        edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));

        // Store in ref for disposal
        geometryRef.current = edgeGeo;

        return edgeGeo;
      }
    }

    // Triangle mode or no quad pair - show triangle edges
    const i = faceIndex * 3;
    const v0Idx = indices.getX(i);
    const v1Idx = indices.getX(i + 1);
    const v2Idx = indices.getX(i + 2);

    const v0 = new THREE.Vector3().fromBufferAttribute(positions, v0Idx);
    const v1 = new THREE.Vector3().fromBufferAttribute(positions, v1Idx);
    const v2 = new THREE.Vector3().fromBufferAttribute(positions, v2Idx);

    // Create edge positions manually (3 edges of triangle)
    const edgePositions = new Float32Array([
      ...v0.toArray(), ...v1.toArray(),
      ...v1.toArray(), ...v2.toArray(),
      ...v2.toArray(), ...v0.toArray(),
    ]);

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));

    // Store in ref for disposal
    geometryRef.current = edgeGeo;

    return edgeGeo;
  }, [geometry, faceIndex, cutMode]);

  // Cleanup on unmount or when geometry changes
  useEffect(() => {
    return () => {
      if (faceGeometry) {
        faceGeometry.dispose();
      }
    };
  }, [faceGeometry]);

  if (!faceGeometry) return null;

  return (
    <group>
      {/* Highlighted face edges (Sprint Y: Quad-aware, no diagonals) */}
      <lineSegments
        geometry={faceGeometry}
        position={position}
        rotation={rotation}
        scale={scale}
      >
        <lineBasicMaterial
          color="#10B981"
          linewidth={3}
          transparent
          opacity={0.9}
          depthTest={false}
        />
      </lineSegments>
    </group>
  );
}
