/**
 * Light Gizmo Component
 *
 * Visual helpers for lights (spheres, cones, arrows).
 */

import React from 'react';
import { PointLightHelper, SpotLightHelper, DirectionalLightHelper } from '@react-three/drei';
import * as THREE from 'three';
import { SceneObject } from '../../stores/objectsStore';

interface LightGizmoProps {
  object: SceneObject;
  isSelected: boolean;
}

export function LightGizmo({ object, isSelected }: LightGizmoProps) {
  if (!object.visible || !object.lightProps) return null;

  const helperColor = isSelected ? '#7C3AED' : '#F59E0B';

  switch (object.type) {
    case 'pointLight':
      return (
        <>
          {/* Visual sphere at light position */}
          <mesh position={object.position}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color={helperColor} />
          </mesh>
        </>
      );

    case 'spotLight':
      return (
        <>
          {/* Visual cone for spot light */}
          <mesh position={object.position} rotation={object.rotation}>
            <coneGeometry args={[0.3, 0.5, 16]} />
            <meshBasicMaterial color={helperColor} wireframe />
          </mesh>
          {/* Line to target */}
          {object.lightProps.target && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    ...object.position,
                    ...object.lightProps.target,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={helperColor} opacity={0.5} transparent />
            </line>
          )}
        </>
      );

    case 'directionalLight':
      return (
        <>
          {/* Visual disc for directional light */}
          <mesh position={object.position}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
            <meshBasicMaterial color={helperColor} wireframe />
          </mesh>
          {/* Arrow showing direction */}
          {object.lightProps.target && (
            <arrowHelper
              args={[
                new THREE.Vector3(...object.lightProps.target).normalize(),
                new THREE.Vector3(...object.position),
                2,
                helperColor,
                0.5,
                0.3,
              ]}
            />
          )}
        </>
      );

    case 'ambientLight':
      // Ambient lights don't have a position, but show an icon in the corner
      return (
        <mesh position={[-8, 8, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color={helperColor} wireframe />
        </mesh>
      );

    default:
      return null;
  }
}
