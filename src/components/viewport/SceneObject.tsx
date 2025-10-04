/**
 * SceneObject Component
 *
 * Renders a 3D object in the scene based on its type and properties.
 * Now with full PBR material support from materials store.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { SceneObject as SceneObjectType } from '../../stores/objectsStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useEditModePicking } from '../../hooks/useEditModePicking';
import { EditModeHelpers } from './EditModeHelpers';
import { KnifeFaceHighlight } from './KnifeFaceHighlight';
import { useEditModeStore } from '../../stores/editModeStore';
import { useKnifeToolStore } from '../../stores/knifeToolStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import {
  findLineIntersections,
  findNearbyEdge,
  closestPointOnLine,
} from '../../lib/geometry/IntersectionUtils';

interface SceneObjectProps {
  object: SceneObjectType;
  isSelected: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
}

export function SceneObject({ object, isSelected, onSelect }: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.Light>(null);

  // Get shading mode from scene store
  const shadingMode = useSceneStore((state) => state.shadingMode);

  // Edit mode picking
  const { handleEditModeClick, isEditMode } = useEditModePicking();
  const { editingObjectId } = useEditModeStore();

  // Knife tool state
  const {
    isActive: isKnifeActive,
    drawingPath,
    intersectionPoints,
    targetFaceIndex,
    addPathPoint,
    setIntersectionPoints,
  } = useKnifeToolStore();

  // Get material assigned to this object - subscribe to materials Map for reactivity
  const objectMaterials = useMaterialsStore((state) => state.objectMaterials);
  const materials = useMaterialsStore((state) => state.materials);
  const getTexture = useMaterialsStore((state) => state.getTexture);

  const assignedMaterialId = objectMaterials.get(object.id);
  const assignedMaterial = assignedMaterialId ? materials.get(assignedMaterialId) : null;

  // Check if this is a light object
  const isLight = ['pointLight', 'spotLight', 'directionalLight', 'ambientLight'].includes(object.type);

  // Shared light helper geometries (created once, reused for all lights)
  const lightHelperGeometries = useMemo(() => ({
    pointLightSphere: new THREE.SphereGeometry(0.2, 16, 16),
    spotLightCone: new THREE.ConeGeometry(0.3, 0.5, 8, 1, true),
    directionalLightPlane: new THREE.PlaneGeometry(0.5, 0.5),
    ambientLightIco: new THREE.IcosahedronGeometry(0.2, 1),
  }), []);

  // Cleanup light helper geometries on unmount
  useEffect(() => {
    return () => {
      Object.values(lightHelperGeometries).forEach(geo => geo.dispose());
    };
  }, [lightHelperGeometries]);

  // Create geometry based on object type
  const geometry = useMemo(() => {
    // PRIORITY 1: Check if we have saved geometry data (from edit mode modifications)
    if (object.geometry?.data) {
      console.log(`[SceneObject] Restoring saved geometry for ${object.name}`);
      const geo = new THREE.BufferGeometry();
      const data = object.geometry.data;

      // Restore position attribute
      if (data.attributes?.position) {
        geo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(
            new Float32Array(data.attributes.position.array),
            data.attributes.position.itemSize
          )
        );
      }

      // Restore normal attribute
      if (data.attributes?.normal) {
        geo.setAttribute(
          'normal',
          new THREE.Float32BufferAttribute(
            new Float32Array(data.attributes.normal.array),
            data.attributes.normal.itemSize
          )
        );
      }

      // Restore UV attribute
      if (data.attributes?.uv) {
        geo.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute(
            new Float32Array(data.attributes.uv.array),
            data.attributes.uv.itemSize
          )
        );
      }

      // Restore index
      if (data.index) {
        geo.setIndex(
          new THREE.Uint32BufferAttribute(
            new Uint32Array(data.index.array),
            1
          )
        );
      }

      geo.computeBoundingBox();
      geo.computeBoundingSphere();

      return geo;
    }

    // Handle imported geometry
    if (object.type === 'imported' && object.importedGeometry) {
      const geo = new THREE.BufferGeometry();
      const { vertices, normals, uvs, indices } = object.importedGeometry;

      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      if (normals && normals.length > 0) {
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      }
      if (uvs && uvs.length > 0) {
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }
      if (indices && indices.length > 0) {
        geo.setIndex(indices);
      }

      geo.computeBoundingSphere();
      if (!normals || normals.length === 0) {
        geo.computeVertexNormals();
      }

      return geo;
    }

    // Handle primitives (only if no saved data)
    const params = object.geometryParams || {};

    switch (object.type) {
      case 'box':
        return new THREE.BoxGeometry(
          params.width || 1,
          params.height || 1,
          params.depth || 1
        );
      case 'sphere':
        return new THREE.SphereGeometry(
          params.radius || 0.5,
          params.widthSegments || 32,
          params.heightSegments || 16
        );
      case 'cylinder':
        return new THREE.CylinderGeometry(
          params.radiusTop || 0.5,
          params.radiusBottom || 0.5,
          params.height || 1,
          params.radialSegments || 32
        );
      case 'cone':
        return new THREE.ConeGeometry(
          params.radius || 0.5,
          params.height || 1,
          params.radialSegments || 32
        );
      case 'torus':
        return new THREE.TorusGeometry(
          params.radius || 0.5,
          params.tube || 0.2,
          params.radialSegments || 16,
          params.tubularSegments || 100
        );
      case 'plane':
        return new THREE.PlaneGeometry(
          params.width || 1,
          params.height || 1
        );
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [object.type, object.geometryParams, object.importedGeometry, object.geometry]);

  // Create material with PBR properties
  const material = useMemo(() => {
    // Override material based on shading mode
    if (shadingMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: isSelected ? '#7C3AED' : '#FFFFFF',
        wireframe: true,
      });
    }

    if (shadingMode === 'solid') {
      return new THREE.MeshStandardMaterial({
        color: isSelected ? '#7C3AED' : '#CCCCCC',
        metalness: 0.1,
        roughness: 0.8,
      });
    }

    // Material mode - use full PBR materials
    if (assignedMaterial) {
      // Use assigned material from store with PBR properties
      const matProps: any = {
        color: new THREE.Color(isSelected ? '#7C3AED' : assignedMaterial.albedo),
        metalness: assignedMaterial.metallic,
        roughness: assignedMaterial.roughness,
        transparent: assignedMaterial.transparent,
        opacity: assignedMaterial.opacity,
        side: assignedMaterial.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      };

      // Add emissive properties
      if (assignedMaterial.emissionIntensity > 0) {
        matProps.emissive = new THREE.Color(assignedMaterial.emission);
        matProps.emissiveIntensity = assignedMaterial.emissionIntensity;
      }

      // Add texture maps if present
      if (assignedMaterial.albedoMap) {
        const tex = getTexture(assignedMaterial.albedoMap);
        if (tex) {
          const loader = new THREE.TextureLoader();
          matProps.map = loader.load(tex.url);
        }
      }

      if (assignedMaterial.normalMap) {
        const tex = getTexture(assignedMaterial.normalMap);
        if (tex) {
          const loader = new THREE.TextureLoader();
          matProps.normalMap = loader.load(tex.url);
        }
      }

      if (assignedMaterial.roughnessMap) {
        const tex = getTexture(assignedMaterial.roughnessMap);
        if (tex) {
          const loader = new THREE.TextureLoader();
          matProps.roughnessMap = loader.load(tex.url);
        }
      }

      if (assignedMaterial.metallicMap) {
        const tex = getTexture(assignedMaterial.metallicMap);
        if (tex) {
          const loader = new THREE.TextureLoader();
          matProps.metalnessMap = loader.load(tex.url);
        }
      }

      if (assignedMaterial.emissionMap) {
        const tex = getTexture(assignedMaterial.emissionMap);
        if (tex) {
          const loader = new THREE.TextureLoader();
          matProps.emissiveMap = loader.load(tex.url);
        }
      }

      if (assignedMaterial.aoMap) {
        const tex = getTexture(assignedMaterial.aoMap);
        if (tex) {
          const loader = new THREE.TextureLoader();
          matProps.aoMap = loader.load(tex.url);
        }
      }

      if (assignedMaterial.displacementMap) {
        const tex = getTexture(assignedMaterial.displacementMap);
        if (tex) {
          const loader = new THREE.TextureLoader();
          matProps.displacementMap = loader.load(tex.url);
        }
      }

      return new THREE.MeshStandardMaterial(matProps);
    }

    // Default material when no material is assigned
    return new THREE.MeshStandardMaterial({
      color: isSelected ? 0x7C3AED : 0x888888,
      metalness: 0.3,
      roughness: 0.7,
    });
  }, [
    shadingMode,
    assignedMaterial?.albedo,
    assignedMaterial?.metallic,
    assignedMaterial?.roughness,
    assignedMaterial?.emission,
    assignedMaterial?.emissionIntensity,
    assignedMaterial?.opacity,
    assignedMaterial?.transparent,
    assignedMaterial?.doubleSided,
    assignedMaterial?.albedoMap,
    assignedMaterial?.normalMap,
    assignedMaterial?.roughnessMap,
    assignedMaterial?.metallicMap,
    assignedMaterial?.emissionMap,
    assignedMaterial?.aoMap,
    assignedMaterial?.displacementMap,
    isSelected,
    getTexture,
  ]);

  // Register mesh with registry when it's available
  useEffect(() => {
    if (meshRef.current && !isLight) {
      meshRegistry.registerMesh(object.id, meshRef.current);

      return () => {
        meshRegistry.unregisterMesh(object.id);
      };
    }
  }, [object.id, isLight]);

  // Cleanup: Dispose geometry and material on unmount or when they change
  useEffect(() => {
    // Store references to current geometry and material
    const currentGeometry = geometry;
    const currentMaterial = material;

    return () => {
      // Dispose geometry
      if (currentGeometry) {
        currentGeometry.dispose();
      }

      // Dispose material (including textures)
      if (currentMaterial) {
        if (currentMaterial instanceof THREE.Material) {
          // Dispose textures in material
          Object.keys(currentMaterial).forEach((key) => {
            const value = (currentMaterial as any)[key];
            if (value && value instanceof THREE.Texture) {
              value.dispose();
            }
          });
          // Dispose material itself
          currentMaterial.dispose();
        }
      }
    };
  }, [geometry, material]);

  // Handle click
  const handleClick = (event: THREE.Event) => {
    event.stopPropagation();

    // Priority 1: Knife tool (if active in edit mode)
    if (isKnifeActive && isEditMode && editingObjectId === object.id && meshRef.current) {
      const intersection = (event as any).intersections?.[0];
      if (intersection) {
        // Try to find nearby edge to snap to
        const nearbyEdge = findNearbyEdge(
          intersection.point,
          meshRef.current.geometry,
          meshRef.current,
          0.15 // Snap threshold
        );

        let snapPoint: THREE.Vector3;

        if (nearbyEdge) {
          // Snap to edge - find closest point on that edge
          const positions = meshRef.current.geometry.attributes.position;
          const [v0Idx, v1Idx] = nearbyEdge;

          const p0 = new THREE.Vector3().fromBufferAttribute(positions, v0Idx);
          const p1 = new THREE.Vector3().fromBufferAttribute(positions, v1Idx);

          // Transform to world space
          meshRef.current.localToWorld(p0);
          meshRef.current.localToWorld(p1);

          // Find closest point on the edge
          snapPoint = closestPointOnLine(p0, p1, intersection.point);

          console.log('[KnifeTool] Snapped to edge:', nearbyEdge);
        } else {
          // Use the clicked point
          snapPoint = intersection.point.clone();
        }

        // If we already have a target face, validate this click is on the same face
        if (targetFaceIndex !== null && intersection.faceIndex !== targetFaceIndex) {
          console.warn('[KnifeTool] Second point must be on the same face! Click on face', targetFaceIndex);
          return; // Ignore clicks on different faces
        }

        // Add point to cutting path (pass face index for first point)
        addPathPoint(snapPoint, intersection.faceIndex);

        // If we have 2 points, find intersections
        if (drawingPath.length === 1) {
          // We just added the second point, calculate intersections
          const currentPath = [...drawingPath, snapPoint];

          if (currentPath.length === 2) {
            const intersections = findLineIntersections(
              currentPath[0],
              currentPath[1],
              meshRef.current.geometry,
              meshRef.current
            );

            // Filter to only intersections on the same face as the first point
            // For now, log all intersections and let algorithm handle it
            console.log('[KnifeTool] Total intersections:', intersections.length);
            intersections.forEach(int => {
              console.log('  - Face', int.faceIndex, 'at', int.point.toArray());
            });

            setIntersectionPoints(intersections);
          }
        }
      }
      return;
    }

    // Priority 2: Edit mode picking
    if (isEditMode && meshRef.current) {
      handleEditModeClick(event, meshRef.current);
    }
    // Priority 3: Normal object selection
    else {
      onSelect(object.id, event.nativeEvent.shiftKey || event.nativeEvent.ctrlKey || event.nativeEvent.metaKey);
    }
  };

  if (!object.visible) return null;

  // Render lights
  if (isLight) {
    const lightProps = object.lightProps || {
      color: '#FFFFFF',
      intensity: 1,
      distance: 0,
      decay: 2,
      castShadow: false,
    };

    const lightColor = new THREE.Color(lightProps.color);

    switch (object.type) {
      case 'pointLight':
        return (
          <group position={object.position}>
            <pointLight
              ref={lightRef}
              color={lightColor}
              intensity={lightProps.intensity}
              distance={lightProps.distance}
              decay={lightProps.decay}
              castShadow={lightProps.castShadow}
              shadow-mapSize-width={lightProps.shadowMapSize || 1024}
              shadow-mapSize-height={lightProps.shadowMapSize || 1024}
              shadow-bias={lightProps.shadowBias || -0.0001}
              shadow-radius={lightProps.shadowRadius || 1}
            />
            {/* Helper sphere to visualize light position */}
            <mesh onClick={handleClick} geometry={lightHelperGeometries.pointLightSphere}>
              <meshBasicMaterial color={isSelected ? '#7C3AED' : lightProps.color} />
            </mesh>
          </group>
        );

      case 'spotLight':
        return (
          <group position={object.position} rotation={object.rotation}>
            <spotLight
              ref={lightRef}
              color={lightColor}
              intensity={lightProps.intensity}
              distance={lightProps.distance}
              decay={lightProps.decay}
              angle={lightProps.angle || Math.PI / 6}
              penumbra={lightProps.penumbra || 0.1}
              castShadow={lightProps.castShadow}
              shadow-mapSize-width={lightProps.shadowMapSize || 1024}
              shadow-mapSize-height={lightProps.shadowMapSize || 1024}
              shadow-bias={lightProps.shadowBias || -0.0001}
              shadow-radius={lightProps.shadowRadius || 1}
            />
            {/* Helper cone to visualize spot light */}
            <mesh onClick={handleClick} geometry={lightHelperGeometries.spotLightCone}>
              <meshBasicMaterial color={isSelected ? '#7C3AED' : lightProps.color} wireframe />
            </mesh>
          </group>
        );

      case 'directionalLight':
        return (
          <group position={object.position} rotation={object.rotation}>
            <directionalLight
              ref={lightRef}
              color={lightColor}
              intensity={lightProps.intensity}
              castShadow={lightProps.castShadow}
              shadow-mapSize-width={lightProps.shadowMapSize || 2048}
              shadow-mapSize-height={lightProps.shadowMapSize || 2048}
              shadow-bias={lightProps.shadowBias || -0.0001}
              shadow-radius={lightProps.shadowRadius || 1}
              shadow-camera-left={-10}
              shadow-camera-right={10}
              shadow-camera-top={10}
              shadow-camera-bottom={-10}
              shadow-camera-near={0.5}
              shadow-camera-far={50}
            />
            {/* Helper to visualize directional light */}
            <mesh onClick={handleClick} geometry={lightHelperGeometries.directionalLightPlane}>
              <meshBasicMaterial color={isSelected ? '#7C3AED' : lightProps.color} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );

      case 'ambientLight':
        return (
          <group position={object.position}>
            <ambientLight
              ref={lightRef}
              color={lightColor}
              intensity={lightProps.intensity}
            />
            {/* Helper sphere to visualize ambient light */}
            <mesh onClick={handleClick} geometry={lightHelperGeometries.ambientLightIco}>
              <meshBasicMaterial color={isSelected ? '#7C3AED' : lightProps.color} wireframe />
            </mesh>
          </group>
        );
    }
  }

  // Render meshes
  return (
    <>
      <mesh
        ref={meshRef}
        key={`${object.id}-${shadingMode}`}
        geometry={geometry}
        material={material}
        position={object.position}
        rotation={object.rotation}
        scale={object.scale}
        onClick={handleClick}
        userData={{ id: object.id, type: object.type }}
        castShadow
        receiveShadow
      />

      {/* Knife tool: Show edges as wireframe overlay */}
      {isKnifeActive && isEditMode && editingObjectId === object.id && meshRef.current && (
        <>
          {/* Show all edges if no points selected yet */}
          {drawingPath.length === 0 && (
            <mesh
              geometry={geometry}
              position={object.position}
              rotation={object.rotation}
              scale={object.scale}
            >
              <meshBasicMaterial
                color="#10B981"
                wireframe
                transparent
                opacity={0.3}
                depthTest={false}
              />
            </mesh>
          )}

          {/* Show only the selected face's edges after first point */}
          {drawingPath.length === 1 && targetFaceIndex !== null && (
            <KnifeFaceHighlight
              geometry={geometry}
              faceIndex={targetFaceIndex}
              position={object.position}
              rotation={object.rotation}
              scale={object.scale}
            />
          )}
        </>
      )}

      {/* Edit mode helpers for vertex/edge/face selection */}
      {isEditMode && editingObjectId === object.id && !isKnifeActive && meshRef.current && (
        <EditModeHelpers mesh={meshRef.current} objectId={object.id} />
      )}
    </>
  );
}
