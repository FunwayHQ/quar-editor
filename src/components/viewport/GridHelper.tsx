/**
 * Grid Helper Component
 *
 * Purple-tinted semitransparent grid for the 3D viewport (lines only, no plane).
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface GridHelperProps {
  size?: number;
  divisions?: number;
}

export function GridHelper({ size = 10, divisions = 10 }: GridHelperProps) {
  const gridRef = useRef<THREE.GridHelper>(null!);

  useEffect(() => {
    if (!gridRef.current) return;

    // Make grid lines semitransparent
    const material = gridRef.current.material as THREE.LineBasicMaterial;
    if (material) {
      material.opacity = 0.3;
      material.transparent = true;
      material.depthWrite = false; // Prevent z-fighting
    }
  }, []);

  return (
    <gridHelper
      ref={gridRef}
      args={[size, divisions, '#7C3AED', '#5B21B6']}
      rotation={[0, 0, 0]}
    />
  );
}
