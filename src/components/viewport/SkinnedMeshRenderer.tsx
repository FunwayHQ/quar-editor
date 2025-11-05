/**
 * Skinned Mesh Renderer Component
 *
 * Renders meshes with real-time skeletal deformation.
 * Epic 7: Skeletal Mesh Deformation
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useObjectsStore } from '../../stores/objectsStore';
import { useBoneStore } from '../../stores/boneStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { computeSkinnedMesh } from '../../lib/skinning/SkinningSolver';
import * as THREE from 'three';

interface SkinnedMeshRendererProps {
  meshId: string;
}

export function SkinnedMeshRenderer({ meshId }: SkinnedMeshRendererProps) {
  const { objects } = useObjectsStore();
  const { isPoseMode, isWeightPaintMode } = useBoneStore();
  const { getMaterialForObject } = useMaterialsStore();

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const needsUpdate = useRef(false);

  const mesh = objects.get(meshId);

  if (!mesh || !mesh.skinData || !mesh.importedGeometry) {
    return null;
  }

  // Don't render during weight paint mode (WeightVisualization handles that)
  if (isWeightPaintMode) {
    return null;
  }

  return <SkinnedMeshInternal meshId={meshId} />;
}

function SkinnedMeshInternal({ meshId }: SkinnedMeshRendererProps) {
  const { objects } = useObjectsStore();
  const { isPoseMode } = useBoneStore();
  const { getMaterialForObject } = useMaterialsStore();

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const mesh = objects.get(meshId);

  if (!mesh || !mesh.skinData || !mesh.importedGeometry) {
    return null;
  }

  const armatureId = mesh.skinData.armatureId;

  // Get all bones for this armature
  const bones = useMemo(() => {
    return Array.from(objects.values()).filter(
      obj => obj.type === 'bone' && (
        obj.parentId === armatureId ||
        isBoneInHierarchy(obj, armatureId, objects)
      )
    );
  }, [objects, armatureId]);

  // Create bone map for fast lookup
  const boneMap = useMemo(() => {
    const map = new Map();
    bones.forEach(bone => map.set(bone.id, bone));
    // Add armature too
    const armature = objects.get(armatureId);
    if (armature) map.set(armatureId, armature);
    return map;
  }, [bones, objects, armatureId]);

  // Build current poses from bone transforms
  const poses = useMemo(() => {
    const poseMap = new Map();

    bones.forEach(bone => {
      // Convert Euler rotation to Quaternion
      const euler = new THREE.Euler(...bone.rotation);
      const quat = new THREE.Quaternion().setFromEuler(euler);

      poseMap.set(bone.id, {
        position: bone.position,
        rotation: [quat.x, quat.y, quat.z, quat.w],
        scale: bone.scale,
      });
    });

    return poseMap;
  }, [bones]);

  // Initial deformed vertices (for first render)
  const initialDeformedVertices = useMemo(() => {
    if (isPoseMode || poses.size > 0) {
      return computeSkinnedMesh(mesh, bones, boneMap, poses);
    }
    return null;
  }, []);

  // Create initial geometry
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();

    // Use deformed vertices if available, otherwise original
    const vertices = initialDeformedVertices || new Float32Array(mesh.importedGeometry.vertices);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // Set normals
    if (mesh.importedGeometry.normals && mesh.importedGeometry.normals.length > 0) {
      const normals = new Float32Array(mesh.importedGeometry.normals);
      geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    } else {
      geom.computeVertexNormals();
    }

    // Set UVs
    if (mesh.importedGeometry.uvs && mesh.importedGeometry.uvs.length > 0) {
      const uvs = new Float32Array(mesh.importedGeometry.uvs);
      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }

    // Set indices
    if (mesh.importedGeometry.indices && mesh.importedGeometry.indices.length > 0) {
      const indices = new Uint32Array(mesh.importedGeometry.indices);
      geom.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    return geom;
  }, [mesh.importedGeometry]);

  // Get material
  const material = useMemo(() => {
    const mat = getMaterialForObject(meshId);
    if (mat) {
      return new THREE.MeshStandardMaterial({
        color: mat.albedo,
        metalness: mat.metallic,
        roughness: mat.roughness,
        emissive: mat.emission,
        emissiveIntensity: mat.emissionIntensity,
        opacity: mat.opacity,
        transparent: mat.transparent,
        side: mat.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      });
    }
    return new THREE.MeshStandardMaterial({ color: '#888888' });
  }, [meshId, getMaterialForObject]);

  // Update geometry continuously during pose mode or animation
  useFrame(() => {
    if (geometryRef.current && (isPoseMode || poses.size > 0)) {
      const positionAttr = geometryRef.current.getAttribute('position');
      if (positionAttr) {
        // Rebuild poses from current bone transforms
        const currentPoses = new Map();
        bones.forEach(bone => {
          const euler = new THREE.Euler(...bone.rotation);
          const quat = new THREE.Quaternion().setFromEuler(euler);
          currentPoses.set(bone.id, {
            position: bone.position,
            rotation: [quat.x, quat.y, quat.z, quat.w],
            scale: bone.scale,
          });
        });

        // Recompute deformation
        const newDeformed = computeSkinnedMesh(mesh, bones, boneMap, currentPoses);
        if (newDeformed) {
          positionAttr.set(newDeformed);
          positionAttr.needsUpdate = true;
          geometryRef.current.computeVertexNormals();
        }
      }
    }
  });

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
      ref={(ref) => {
        if (ref) {
          geometryRef.current = ref.geometry as THREE.BufferGeometry;
        }
      }}
    />
  );
}

// Helper to check if bone is in armature hierarchy
function isBoneInHierarchy(
  bone: any,
  armatureId: string,
  objects: Map<string, any>
): boolean {
  let current = bone;
  while (current.parentId) {
    if (current.parentId === armatureId) return true;
    current = objects.get(current.parentId);
    if (!current) break;
  }
  return false;
}
