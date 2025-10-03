/**
 * Grid Helper Component
 *
 * Purple-tinted grid for the 3D viewport.
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

    // Set purple-tinted colors
    gridRef.current.material = new THREE.LineBasicMaterial({
      color: new THREE.Color('#7C3AED'),
      opacity: 0.5,
      transparent: true,
    });
  }, []);

  return (
    <gridHelper
      ref={gridRef}
      args={[size, divisions, '#A855F7', '#7C3AED']}
      rotation={[0, 0, 0]}
    />
  );
}
