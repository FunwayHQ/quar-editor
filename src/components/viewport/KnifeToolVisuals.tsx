/**
 * Knife Tool Visuals Component
 *
 * Renders the cutting path and intersection markers.
 * Mini-Sprint: Knife Tool Implementation
 */

import React from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useKnifeToolStore } from '../../stores/knifeToolStore';

// Module-level shared geometries and materials — created once, reused forever, no leak
const pathPointGeo = new THREE.SphereGeometry(0.04, 8, 8);
const outerGlowGeo = new THREE.SphereGeometry(0.06, 8, 8);
const coreMarkerGeo = new THREE.SphereGeometry(0.03, 12, 12);

const greenMat = new THREE.MeshBasicMaterial({
  color: '#10B981',
  depthTest: false,
  depthWrite: false,
});
const greenGlowMat = new THREE.MeshBasicMaterial({
  color: '#10B981',
  transparent: true,
  opacity: 0.3,
  depthTest: false,
  depthWrite: false,
});

export function KnifeToolVisuals() {
  const { isActive, drawingPath, intersectionPoints } = useKnifeToolStore();

  if (!isActive || drawingPath.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Draw the cut path as a green line */}
      {drawingPath.length >= 2 && (
        <Line
          points={drawingPath}
          color="#10B981"
          lineWidth={3}
          dashed={false}
        />
      )}

      {/* Show points along the path */}
      {drawingPath.map((point, i) => (
        <mesh key={`path-point-${i}`} position={point} geometry={pathPointGeo} material={greenMat} />
      ))}

      {/* Show intersection points on mesh faces */}
      {intersectionPoints.map((int, i) => (
        <group key={`intersection-${i}`}>
          {/* Outer glow */}
          <mesh position={int.point} geometry={outerGlowGeo} material={greenGlowMat} />
          {/* Core marker */}
          <mesh position={int.point} geometry={coreMarkerGeo} material={greenMat} />
        </group>
      ))}
    </group>
  );
}
