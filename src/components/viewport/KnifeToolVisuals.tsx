/**
 * Knife Tool Visuals Component
 *
 * Renders the cutting path and intersection markers.
 * Mini-Sprint: Knife Tool Implementation
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useKnifeToolStore } from '../../stores/knifeToolStore';

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
        <mesh key={`path-point-${i}`} position={point}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial
            color="#10B981"
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Show intersection points on mesh faces */}
      {intersectionPoints.map((int, i) => (
        <group key={`intersection-${i}`}>
          {/* Outer glow */}
          <mesh position={int.point}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial
              color="#10B981"
              transparent
              opacity={0.3}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          {/* Core marker */}
          <mesh position={int.point}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial
              color="#10B981"
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
