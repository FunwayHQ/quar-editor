/**
 * Weight Visualization Component
 *
 * Renders mesh with color-coded vertex weights in weight paint mode.
 * Epic 6: Weight Painting & Skinning Tools
 */

import React, { useMemo } from 'react';
import { useBoneStore } from '../../stores/boneStore';
import { useObjectsStore } from '../../stores/objectsStore';
import * as THREE from 'three';

export function WeightVisualization() {
  const { isWeightPaintMode, weightPaintMeshId, weightPaintBoneId } = useBoneStore();
  const { objects } = useObjectsStore();

  // Only render in weight paint mode
  if (!isWeightPaintMode || !weightPaintMeshId || !weightPaintBoneId) {
    return null;
  }

  const mesh = objects.get(weightPaintMeshId);
  if (!mesh || !mesh.skinData || !mesh.importedGeometry) {
    return null;
  }

  return <WeightVisualizedMesh mesh={mesh} boneId={weightPaintBoneId} />;
}

interface WeightVisualizedMeshProps {
  mesh: any;
  boneId: string;
}

function WeightVisualizedMesh({ mesh, boneId }: WeightVisualizedMeshProps) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();

    // Set position attribute
    const positions = new Float32Array(mesh.importedGeometry.vertices);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Set normal attribute if available
    if (mesh.importedGeometry.normals && mesh.importedGeometry.normals.length > 0) {
      const normals = new Float32Array(mesh.importedGeometry.normals);
      geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    } else {
      geom.computeVertexNormals();
    }

    // Set indices if available
    if (mesh.importedGeometry.indices && mesh.importedGeometry.indices.length > 0) {
      const indices = new Uint32Array(mesh.importedGeometry.indices);
      geom.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    // Create color attribute based on vertex weights
    const vertexCount = mesh.importedGeometry.vertices.length / 3;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const influences = mesh.skinData.weights.get(i) || [];
      const boneInfluence = influences.find(inf => inf.boneId === boneId);
      const weight = boneInfluence ? boneInfluence.weight : 0;

      // Color gradient: Blue (0.0) -> Cyan -> Green -> Yellow -> Red (1.0)
      const color = getWeightColor(weight);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geom;
  }, [mesh, boneId]);

  return (
    <mesh
      geometry={geometry}
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
    >
      <meshBasicMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/**
 * Get color for a weight value (0.0 to 1.0)
 * Blue (0.0) -> Cyan -> Green -> Yellow -> Red (1.0)
 */
function getWeightColor(weight: number): { r: number; g: number; b: number } {
  // Clamp weight to [0, 1]
  weight = Math.max(0, Math.min(1, weight));

  if (weight < 0.25) {
    // Blue to Cyan
    const t = weight / 0.25;
    return { r: 0, g: t, b: 1 };
  } else if (weight < 0.5) {
    // Cyan to Green
    const t = (weight - 0.25) / 0.25;
    return { r: 0, g: 1, b: 1 - t };
  } else if (weight < 0.75) {
    // Green to Yellow
    const t = (weight - 0.5) / 0.25;
    return { r: t, g: 1, b: 0 };
  } else {
    // Yellow to Red
    const t = (weight - 0.75) / 0.25;
    return { r: 1, g: 1 - t, b: 0 };
  }
}
