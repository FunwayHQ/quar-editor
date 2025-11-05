/**
 * File Import Component
 *
 * Handles importing 3D model files (GLB, GLTF, OBJ, FBX, STL).
 */

import React, { useRef } from 'react';
import { FileUp } from 'lucide-react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';
import { useObjectsStore, SceneObject } from '../../stores/objectsStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { useCommandStore } from '../../stores/commandStore';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';
import { useCurveStore } from '../../stores/curveStore';
import { SVGParser } from '../../lib/curves/SVGParser';
import { SkeletonImporter } from '../../lib/import/SkeletonImporter';

export function FileImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const executeCommand = useCommandStore((state) => state.executeCommand);
  const addMaterial = useMaterialsStore((state) => state.addMaterial);
  const assignMaterialToObject = useMaterialsStore((state) => state.assignMaterialToObject);
  const addCurve = useCurveStore((state) => state.addCurve);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'svg') {
        await importSVG(file);
      } else if (extension === 'glb' || extension === 'gltf') {
        await importGLTF(file);
      } else if (extension === 'fbx') {
        await importFBX(file);
      } else if (extension === 'obj') {
        await importOBJ(file);
      } else {
        alert(`File format .${extension} is not supported yet. Supported formats: SVG, GLB, GLTF, FBX, OBJ`);
      }
    } catch (error) {
      console.error('Failed to import file:', error);
      alert('Failed to import file. Please check the console for details.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importSVG = async (file: File) => {
    console.log('[FileImport] Starting SVG import:', file.name);
    const text = await file.text();
    console.log('[FileImport] SVG file read, length:', text.length);

    try {
      const parsedCurves = SVGParser.parse(text);
      console.log('[FileImport] Parsed curves:', parsedCurves);

      if (parsedCurves.length === 0) {
        alert('No curves found in SVG file. Make sure your SVG contains paths or basic shapes.');
        return;
      }

      // Create Curve objects and add to store
      parsedCurves.forEach(parsed => {
        const curve = SVGParser.createCurve(parsed);
        console.log('[FileImport] Created curve:', curve.name, 'with', curve.points.length, 'points');
        addCurve(curve);
      });

      console.log(`[FileImport] Successfully imported ${parsedCurves.length} curves from SVG`);
    } catch (error) {
      console.error('[FileImport] Failed to parse SVG:', error);
      alert(`Failed to import SVG: ${error}`);
      throw error;
    }
  };

  const importGLTF = async (file: File) => {
    const loader = new GLTFLoader();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          console.log('[FileImport] GLTF loaded:', gltf);

          // Map Three.js objects to SceneObject IDs (for hierarchy)
          const threeToSceneId = new Map<THREE.Object3D, string>();
          const generateName = useObjectsStore.getState().generateName;
          const now = Date.now();

          // Check for skinned meshes (rigged characters)
          const skinnedMeshes = SkeletonImporter.findSkinnedMeshes(gltf.scene);
          const hasSkeletalAnimation = skinnedMeshes.length > 0;

          console.log('[FileImport] Found', skinnedMeshes.length, 'skinned meshes');

          // Import skeleton first if present
          let boneImportResult: ReturnType<typeof SkeletonImporter.importSkeleton> | null = null;
          if (hasSkeletalAnimation && skinnedMeshes[0].skeleton) {
            const skinnedMesh = skinnedMeshes[0];
            boneImportResult = SkeletonImporter.importSkeleton(
              skinnedMesh.skeleton,
              file.name.replace(/\.(glb|gltf)$/i, '')
            );
            console.log('[FileImport] Imported skeleton with armature:', boneImportResult.armatureId);
          }

          // PASS 1: Create all objects and build ID map
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Extract geometry data
              const geometry = child.geometry;
              const positionAttr = geometry.getAttribute('position');
              const normalAttr = geometry.getAttribute('normal');
              const uvAttr = geometry.getAttribute('uv');
              const indexAttr = geometry.getIndex();

              const importedGeometry = {
                vertices: Array.from(positionAttr.array),
                normals: normalAttr ? Array.from(normalAttr.array) : [],
                uvs: uvAttr ? Array.from(uvAttr.array) : [],
                indices: indexAttr ? Array.from(indexAttr.array) : undefined,
              };

              const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              const object: SceneObject = {
                id: objectId,
                name: child.name || generateName('imported'),
                type: 'imported',
                visible: true,
                locked: false,
                position: [child.position.x, child.position.y, child.position.z],
                rotation: [child.rotation.x, child.rotation.y, child.rotation.z],
                scale: [child.scale.x, child.scale.y, child.scale.z],
                parentId: null, // Will be set in pass 2
                children: [],   // Will be populated by setParent
                importedGeometry,
                createdAt: now,
                modifiedAt: now,
              };

              // Map Three.js object to SceneObject ID
              threeToSceneId.set(child, objectId);

              // Create object with command
              const command = new CreateObjectCommand(object);
              executeCommand(command);

              // Extract and create material if it exists
              if (child.material instanceof THREE.MeshStandardMaterial) {
                const mat = child.material;
                const materialId = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const material = {
                  id: materialId,
                  name: mat.name || `Imported Material`,
                  type: 'standard' as const,
                  albedo: `#${mat.color.getHexString()}`,
                  metallic: mat.metalness,
                  roughness: mat.roughness,
                  emission: mat.emissive ? `#${mat.emissive.getHexString()}` : '#000000',
                  emissionIntensity: mat.emissiveIntensity || 0,
                  albedoMap: null,
                  normalMap: null,
                  roughnessMap: null,
                  metallicMap: null,
                  emissionMap: null,
                  aoMap: null,
                  displacementMap: null,
                  opacity: mat.opacity,
                  transparent: mat.transparent,
                  doubleSided: mat.side === THREE.DoubleSide,
                  createdAt: now,
                  modifiedAt: now,
                };

                addMaterial(material);
                assignMaterialToObject(objectId, materialId);
              }

              // Import skinning data if this is a SkinnedMesh
              if (SkeletonImporter.isSkinnedMesh(child) && boneImportResult) {
                console.log('[FileImport] Importing skinning data for:', child.name);
                SkeletonImporter.importSkinning(
                  objectId,
                  child,
                  boneImportResult.boneIdMap,
                  boneImportResult.armatureId
                );
              }
            }
          });

          // PASS 2: Set up parent-child relationships
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const childId = threeToSceneId.get(child);
              if (!childId) return;

              // Check if this mesh has a parent that's also a mesh (part of the hierarchy)
              let parentThreeObj = child.parent;
              while (parentThreeObj && parentThreeObj !== gltf.scene) {
                if (parentThreeObj instanceof THREE.Mesh) {
                  const parentId = threeToSceneId.get(parentThreeObj);
                  if (parentId) {
                    // Set parent relationship
                    const objectsStore = useObjectsStore.getState();
                    objectsStore.setParent(childId, parentId);
                    console.log(`[FileImport] Set parent: ${child.name} → ${parentThreeObj.name}`);
                    break;
                  }
                }
                parentThreeObj = parentThreeObj.parent;
              }
            }
          });

          if (hasSkeletalAnimation) {
            console.log('[FileImport] GLTF import complete with skeletal animation!');
          } else {
            console.log('[FileImport] GLTF import complete with hierarchy preserved');
          }

          URL.revokeObjectURL(url);
          resolve(gltf);
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(url);
          reject(error);
        }
      );
    });
  };

  const importFBX = async (file: File) => {
    const loader = new FBXLoader();

    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (fbx) => {
          console.log('[FileImport] FBX loaded:', fbx);

          // Map Three.js objects to SceneObject IDs (for hierarchy)
          const threeToSceneId = new Map<THREE.Object3D, string>();
          const generateName = useObjectsStore.getState().generateName;
          const now = Date.now();

          // PASS 1: Create all objects and build ID map
          fbx.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Extract geometry
              const geometry = child.geometry;
              const positionAttr = geometry.getAttribute('position');
              const normalAttr = geometry.getAttribute('normal');
              const uvAttr = geometry.getAttribute('uv');
              const indexAttr = geometry.getIndex();

              const importedGeometry = {
                vertices: Array.from(positionAttr.array),
                normals: normalAttr ? Array.from(normalAttr.array) : [],
                uvs: uvAttr ? Array.from(uvAttr.array) : [],
                indices: indexAttr ? Array.from(indexAttr.array) : undefined,
              };

              const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              const object: SceneObject = {
                id: objectId,
                name: child.name || generateName('imported'),
                type: 'imported',
                visible: true,
                locked: false,
                position: [child.position.x, child.position.y, child.position.z],
                rotation: [child.rotation.x, child.rotation.y, child.rotation.z],
                scale: [child.scale.x, child.scale.y, child.scale.z],
                parentId: null, // Will be set in pass 2
                children: [],   // Will be populated by setParent
                importedGeometry,
                createdAt: now,
                modifiedAt: now,
              };

              // Map Three.js object to SceneObject ID
              threeToSceneId.set(child, objectId);

              const command = new CreateObjectCommand(object);
              executeCommand(command);

              // Extract material if exists
              if (child.material instanceof THREE.MeshStandardMaterial ||
                  child.material instanceof THREE.MeshPhongMaterial) {
                const mat = child.material;
                const materialId = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const material = {
                  id: materialId,
                  name: mat.name || `Imported Material`,
                  type: 'standard' as const,
                  albedo: `#${mat.color.getHexString()}`,
                  metallic: 'metalness' in mat ? (mat as any).metalness : 0,
                  roughness: 'roughness' in mat ? (mat as any).roughness : 0.7,
                  emission: mat.emissive ? `#${mat.emissive.getHexString()}` : '#000000',
                  emissionIntensity: mat.emissiveIntensity || 0,
                  albedoMap: null,
                  normalMap: null,
                  roughnessMap: null,
                  metallicMap: null,
                  emissionMap: null,
                  aoMap: null,
                  displacementMap: null,
                  opacity: mat.opacity,
                  transparent: mat.transparent,
                  doubleSided: mat.side === THREE.DoubleSide,
                  createdAt: now,
                  modifiedAt: now,
                };

                addMaterial(material);
                assignMaterialToObject(objectId, materialId);
              }
            }
          });

          // PASS 2: Set up parent-child relationships
          fbx.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const childId = threeToSceneId.get(child);
              if (!childId) return;

              // Check if this mesh has a parent that's also a mesh
              let parentThreeObj = child.parent;
              while (parentThreeObj && parentThreeObj !== fbx) {
                if (parentThreeObj instanceof THREE.Mesh) {
                  const parentId = threeToSceneId.get(parentThreeObj);
                  if (parentId) {
                    // Set parent relationship
                    const objectsStore = useObjectsStore.getState();
                    objectsStore.setParent(childId, parentId);
                    console.log(`[FileImport] FBX Set parent: ${child.name} → ${parentThreeObj.name}`);
                    break;
                  }
                }
                parentThreeObj = parentThreeObj.parent;
              }
            }
          });

          console.log('[FileImport] FBX import complete with hierarchy preserved');
          URL.revokeObjectURL(url);
          resolve(fbx);
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(url);
          reject(error);
        }
      );
    });
  };

  const importOBJ = async (file: File) => {
    const loader = new OBJLoader();

    const text = await file.text();

    return new Promise((resolve, reject) => {
      try {
        const obj = loader.parse(text);
        console.log('[FileImport] OBJ loaded:', obj);

        // Traverse and create objects
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const generateName = useObjectsStore.getState().generateName;
            const now = Date.now();

            // Extract geometry
            const geometry = child.geometry;
            const positionAttr = geometry.getAttribute('position');
            const normalAttr = geometry.getAttribute('normal');
            const uvAttr = geometry.getAttribute('uv');
            const indexAttr = geometry.getIndex();

            const importedGeometry = {
              vertices: Array.from(positionAttr.array),
              normals: normalAttr ? Array.from(normalAttr.array) : [],
              uvs: uvAttr ? Array.from(uvAttr.array) : [],
              indices: indexAttr ? Array.from(indexAttr.array) : undefined,
            };

            const object: SceneObject = {
              id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: child.name || generateName('imported'),
              type: 'imported',
              visible: true,
              locked: false,
              position: [child.position.x, child.position.y, child.position.z],
              rotation: [child.rotation.x, child.rotation.y, child.rotation.z],
              scale: [child.scale.x, child.scale.y, child.scale.z],
              parentId: null,
              children: [],
              importedGeometry,
              createdAt: now,
              modifiedAt: now,
            };

            const command = new CreateObjectCommand(object);
            executeCommand(command);

            // OBJ files typically use MeshPhongMaterial
            if (child.material) {
              const mat = child.material;
              const materialId = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              const material = {
                id: materialId,
                name: `Imported Material`,
                type: 'standard' as const,
                albedo: `#${(mat as any).color?.getHexString() || '888888'}`,
                metallic: 0,
                roughness: 0.7,
                emission: '#000000',
                emissionIntensity: 0,
                albedoMap: null,
                normalMap: null,
                roughnessMap: null,
                metallicMap: null,
                emissionMap: null,
                aoMap: null,
                displacementMap: null,
                opacity: (mat as any).opacity || 1,
                transparent: (mat as any).transparent || false,
                doubleSided: (mat as any).side === THREE.DoubleSide,
                createdAt: now,
                modifiedAt: now,
              };

              addMaterial(material);
              assignMaterialToObject(object.id, materialId);
            }
          }
        });

        resolve(obj);
      } catch (error) {
        reject(error);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded hover:bg-[#27272A] transition-colors group relative"
        title="Import 3D Model"
      >
        <FileUp className="w-5 h-5 text-[#FAFAFA]" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#18181B] border border-[#27272A] rounded text-xs text-[#FAFAFA] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Import Model
        </span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.glb,.gltf,.fbx,.obj"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
