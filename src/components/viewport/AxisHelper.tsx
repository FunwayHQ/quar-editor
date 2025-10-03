/**
 * Axis Helper Component
 *
 * Shows X (red), Y (green), Z (blue) axes with subtle glow.
 */

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function AxisHelper() {
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;

    // Create X axis (Red)
    const xAxis = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      2,
      0xff0000,
      0.3,
      0.2
    );

    // Create Y axis (Green)
    const yAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      2,
      0x00ff00,
      0.3,
      0.2
    );

    // Create Z axis (Blue)
    const zAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      2,
      0x0000ff,
      0.3,
      0.2
    );

    group.add(xAxis, yAxis, zAxis);

    return () => {
      group.remove(xAxis, yAxis, zAxis);
    };
  }, []);

  return <group ref={groupRef} />;
}
