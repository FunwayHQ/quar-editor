/**
 * Bone Renderer Component
 *
 * Renders bones in the 3D viewport with octahedral display style.
 * Handles bone selection, highlighting, and visual representation.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SceneObject as SceneObjectType } from '../../stores/objectsStore';
import { useBoneStore } from '../../stores/boneStore';

interface BoneRendererProps {
  bone: SceneObjectType;
  isSelected: boolean;
  isPoseMode: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
}

/**
 * Creates an octahedral bone geometry
 * This is the standard bone shape used in Blender and other 3D software
 */
function createBoneOctahedron(
  headPos: [number, number, number],
  tailPos: [number, number, number],
  thickness: number = 0.1
): THREE.BufferGeometry {
  const head = new THREE.Vector3(...headPos);
  const tail = new THREE.Vector3(...tailPos);

  // Calculate bone direction and length
  const direction = new THREE.Vector3().subVectors(tail, head);
  const length = direction.length();
  direction.normalize();

  // Calculate perpendicular vectors for the octahedron
  const up = Math.abs(direction.y) > 0.99
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(direction, up).normalize();
  const forward = new THREE.Vector3().crossVectors(right, direction).normalize();

  // Define octahedron vertices
  const midPoint = new THREE.Vector3().lerpVectors(head, tail, 0.3); // Wider at base
  const radius = thickness * length;

  const vertices: number[] = [];
  const indices: number[] = [];

  // Vertex 0: head
  vertices.push(head.x, head.y, head.z);

  // Vertices 1-4: diamond around mid-point
  const v1 = midPoint.clone().add(right.clone().multiplyScalar(radius));
  const v2 = midPoint.clone().add(forward.clone().multiplyScalar(radius));
  const v3 = midPoint.clone().add(right.clone().multiplyScalar(-radius));
  const v4 = midPoint.clone().add(forward.clone().multiplyScalar(-radius));

  vertices.push(v1.x, v1.y, v1.z); // 1
  vertices.push(v2.x, v2.y, v2.z); // 2
  vertices.push(v3.x, v3.y, v3.z); // 3
  vertices.push(v4.x, v4.y, v4.z); // 4

  // Vertex 5: tail
  vertices.push(tail.x, tail.y, tail.z);

  // Faces from head to diamond
  indices.push(0, 1, 2); // head, right, forward
  indices.push(0, 2, 3); // head, forward, left
  indices.push(0, 3, 4); // head, left, back
  indices.push(0, 4, 1); // head, back, right

  // Faces from diamond to tail
  indices.push(5, 2, 1); // tail, forward, right
  indices.push(5, 3, 2); // tail, left, forward
  indices.push(5, 4, 3); // tail, back, left
  indices.push(5, 1, 4); // tail, right, back

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function BoneRenderer({ bone, isSelected, isPoseMode, onSelect }: BoneRendererProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Get armature display settings
  const { selectedBoneIds } = useBoneStore();
  const isInBoneSelection = selectedBoneIds.has(bone.id);

  // Get bone properties
  const boneProps = bone.boneProps;

  if (!boneProps) {
    console.warn('[BoneRenderer] Bone missing boneProps:', bone.id);
    return null;
  }

  // Create bone geometry
  const geometry = useMemo(() => {
    return createBoneOctahedron(
      boneProps.headPosition,
      boneProps.tailPosition,
      0.05 // Base thickness
    );
  }, [boneProps.headPosition, boneProps.tailPosition]);

  // Create bone material
  const material = useMemo(() => {
    let color = '#8B5CF6'; // Default purple color

    if (isPoseMode && isInBoneSelection) {
      color = '#10B981'; // Green when selected in pose mode
    } else if (isSelected) {
      color = '#F59E0B'; // Orange when object is selected
    }

    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
  }, [isSelected, isPoseMode, isInBoneSelection]);

  // Wireframe for bone outline
  const wireframeMaterial = useMemo(() => {
    let color = '#A78BFA'; // Light purple

    if (isPoseMode && isInBoneSelection) {
      color = '#34D399'; // Light green
    } else if (isSelected) {
      color = '#FCD34D'; // Light orange
    }

    return new THREE.LineBasicMaterial({
      color,
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
    });
  }, [isSelected, isPoseMode, isInBoneSelection]);

  const wireframeGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry);
  }, [geometry]);

  // Handle click for bone selection
  const handleClick = (e: any) => {
    e.stopPropagation();

    if (isPoseMode) {
      // In pose mode, use bone selection
      const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      useBoneStore.getState().selectBone(bone.id, multiSelect);
    } else {
      // In object mode, use regular object selection
      const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      onSelect(bone.id, multiSelect);
    }
  };

  // Cleanup geometries on unmount
  React.useEffect(() => {
    return () => {
      geometry.dispose();
      wireframeGeometry.dispose();
      material.dispose();
      wireframeMaterial.dispose();
    };
  }, [geometry, wireframeGeometry, material, wireframeMaterial]);

  return (
    <group>
      {/* Solid bone mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (meshRef.current) {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      />

      {/* Wireframe outline */}
      <lineSegments geometry={wireframeGeometry} material={wireframeMaterial} />

      {/* Bone axis indicator (small line from head to tail) */}
      {isPoseMode && isInBoneSelection && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                ...boneProps.headPosition,
                ...boneProps.tailPosition,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FFFFFF" linewidth={3} />
        </line>
      )}
    </group>
  );
}
