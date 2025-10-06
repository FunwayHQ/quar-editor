/**
 * CurveObject Component
 *
 * Renders a 2D curve as a line on the grid in 3D viewport.
 * Curves are displayed as yellow lines (read-only).
 */

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Curve } from '../../stores/curveStore';
import { ThreeEvent } from '@react-three/fiber';

interface CurveObjectProps {
  curve: Curve;
  isSelected: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
}

export function CurveObject({ curve, isSelected, onSelect }: CurveObjectProps) {
  // Convert 2D points to 3D (on XZ plane at Y=0.05 - slightly above grid)
  const points3D = useMemo(() => {
    return curve.points.map(p => {
      // Apply transform
      // Map SVG's X,Y to 3D's X,Z (so curve lies flat on grid)
      const x = p.x * curve.transform.scale.x + curve.transform.position.x;
      const z = p.y * curve.transform.scale.y + curve.transform.position.z;
      const y = 0.05 + curve.transform.position.y; // Slightly above grid for visibility

      return new THREE.Vector3(x, y, z);
    });
  }, [curve.points, curve.transform]);

  // Close the path if needed
  const linePoints = useMemo(() => {
    if (curve.closed && points3D.length > 0) {
      // Add first point at the end to close the loop
      return [...points3D, points3D[0]];
    }
    return points3D;
  }, [points3D, curve.closed]);

  // Create line geometry and material (memoized to prevent recreation)
  const { lineGeometry, lineMaterial } = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const material = new THREE.LineBasicMaterial({
      color: isSelected ? '#A855F7' : '#FBBF24',
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    return { lineGeometry: geometry, lineMaterial: material };
  }, [linePoints, isSelected]);

  // Cleanup geometry and material on unmount or when recreated
  useEffect(() => {
    return () => {
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [lineGeometry, lineMaterial]);

  if (linePoints.length < 2) {
    return null;
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Also stop on pointer events to prevent background from capturing
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }

    const multiSelect = e.nativeEvent?.shiftKey || e.nativeEvent?.metaKey || e.nativeEvent?.ctrlKey || false;
    console.log('[CurveObject] Clicked:', curve.name, 'multiSelect:', multiSelect, 'event:', e);
    onSelect(curve.id, multiSelect);
  };

  return (
    <>
      {/* Main curve line with click handler */}
      <line geometry={lineGeometry} material={lineMaterial} onClick={handleClick} />

      {/* Invisible thick line for easier clicking */}
      <line geometry={lineGeometry} onClick={handleClick}>
        <lineBasicMaterial
          color="#000000"
          linewidth={20}
          transparent
          opacity={0}
        />
      </line>
    </>
  );
}
