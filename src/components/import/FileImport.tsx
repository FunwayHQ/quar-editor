/**
 * File Import Component
 *
 * Handles importing 3D model files (GLB, GLTF, OBJ, FBX, STL).
 */

import React, { useRef } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';
import { useObjectsStore, SceneObject } from '../../stores/objectsStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { useCommandStore } from '../../stores/commandStore';
import { CreateObjectCommand } from '../../lib/commands/ObjectCommands';

export function FileImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPrimitive = useObjectsStore((state) => state.createPrimitive);
  const addObject = useObjectsStore((state) => state.addObject);
  const executeCommand = useCommandStore((state) => state.executeCommand);
  const addMaterial = useMaterialsStore((state) => state.addMaterial);
  const assignMaterialToObject = useMaterialsStore((state) => state.assignMaterialToObject);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'glb' || extension === 'gltf') {
        await importGLTF(file);
      } else if (extension === 'fbx') {
        await importFBX(file);
      } else if (extension === 'obj') {
        await importOBJ(file);
      } else {
        alert(`File format .${extension} is not supported yet. Supported formats: GLB, GLTF, FBX, OBJ`);
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

          // Traverse the scene and create objects
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Create a new SceneObject from the mesh
              const generateName = useObjectsStore.getState().generateName;
              const now = Date.now();

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
                assignMaterialToObject(object.id, materialId);
              }
            }
          });

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

          // Traverse and create objects
          fbx.traverse((child) => {
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
                assignMaterialToObject(object.id, materialId);
              }
            }
          });

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
        accept=".glb,.gltf,.fbx,.obj"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
