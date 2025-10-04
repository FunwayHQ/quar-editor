/**
 * Knife Face Highlight Component
 *
 * Highlights the selected face's edges for knife tool
 * Shows only edges of the target face after first point
 */

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';

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
  // Create geometry showing only the selected face's edges
  const faceGeometry = useMemo(() => {
    const indices = geometry.index;
    const positions = geometry.attributes.position;

    if (!indices) return null;

    // Get the 3 vertices of this face
    const i = faceIndex * 3;
    const v0Idx = indices.getX(i);
    const v1Idx = indices.getX(i + 1);
    const v2Idx = indices.getX(i + 2);

    const v0 = new THREE.Vector3().fromBufferAttribute(positions, v0Idx);
    const v1 = new THREE.Vector3().fromBufferAttribute(positions, v1Idx);
    const v2 = new THREE.Vector3().fromBufferAttribute(positions, v2Idx);

    // Create a new geometry with just this face
    const geo = new THREE.BufferGeometry();
    const facePositions = new Float32Array([
      ...v0.toArray(),
      ...v1.toArray(),
      ...v2.toArray(),
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(facePositions, 3));
    geo.setIndex([0, 1, 2]);

    // Create edge geometry for the 3 edges
    const edgeGeo = new THREE.EdgesGeometry(geo);

    // Dispose intermediate geometry
    geo.dispose();

    return edgeGeo;
  }, [geometry, faceIndex]);

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
      {/* Highlighted face overlay */}
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
        />
      </lineSegments>

      {/* Semi-transparent face fill to show selected face */}
      <mesh
        position={position}
        rotation={rotation}
        scale={scale}
      >
        <bufferGeometry {...faceGeometry} />
        <meshBasicMaterial
          color="#10B981"
          side={THREE.DoubleSide}
          transparent
          opacity={0.1}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}
