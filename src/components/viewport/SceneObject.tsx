/**
 * SceneObject Component
 *
 * Renders a 3D object in the scene based on its type and properties.
 * Now with full PBR material support from materials store.
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { SceneObject as SceneObjectType, useObjectsStore } from '../../stores/objectsStore';
import { useMaterialsStore } from '../../stores/materialsStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useEditModePicking } from '../../hooks/useEditModePicking';
import { EditModeHelpers } from './EditModeHelpers';
import { KnifeFaceHighlight } from './KnifeFaceHighlight';
import { BoneRenderer } from './BoneRenderer';
import { SkinnedMeshRenderer } from './SkinnedMeshRenderer';
import { useBoneStore } from '../../stores/boneStore';
import { useEditModeStore } from '../../stores/editModeStore';
import { useKnifeToolStore } from '../../stores/knifeToolStore';
import { meshRegistry } from '../../lib/mesh/MeshRegistry';
import {
  findLineIntersections,
  findNearbyEdge,
  closestPointOnLine,
} from '../../lib/geometry/IntersectionUtils';
import { getQuadEdges } from '../../lib/geometry/EdgeFiltering';

// Sprint Y: Memoized knife wireframe to prevent memory leak
function KnifeWireframe({ geometry }: { geometry: THREE.BufferGeometry }) {
  const edgesGeo = useMemo(() => {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
      console.warn('[KnifeWireframe] Invalid geometry');
      return new THREE.BufferGeometry();
    }

    const quadEdgesList = getQuadEdges(geometry);
    const positions = geometry.attributes.position;
    const edgePositions: number[] = [];

    quadEdgesList.forEach(([v0, v1]) => {
      if (v0 < positions.count && v1 < positions.count) {
        edgePositions.push(
          positions.getX(v0), positions.getY(v0), positions.getZ(v0),
          positions.getX(v1), positions.getY(v1), positions.getZ(v1)
        );
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    return geo;
  }, [geometry]);

  // Memoized material to prevent recreation on every render
  const edgeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#10B981',
      transparent: true,
      opacity: 0.3,
      depthTest: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (edgesGeo) {
        edgesGeo.dispose();
      }
      if (edgeMaterial) {
        edgeMaterial.dispose();
      }
    };
  }, [edgesGeo, edgeMaterial]);

  return (
    <lineSegments geometry={edgesGeo} material={edgeMaterial} raycast={() => {}} />
  );
}

interface SceneObjectProps {
  object: SceneObjectType;
  isSelected: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
}

export function SceneObject({ object, isSelected, onSelect }: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.Light>(null);

  // Get child objects for recursive rendering
  const objects = useObjectsStore((state) => state.objects);
  const childObjects = useMemo(() => {
    return object.children
      .map(childId => objects.get(childId))
      .filter((child): child is SceneObjectType => child !== undefined);
  }, [object.children, objects]);

  // Get shading mode from scene store
  const shadingMode = useSceneStore((state) => state.shadingMode);

  // Edit mode picking
  const { handleEditModeClick, isEditMode } = useEditModePicking();
  const { editingObjectId, geometryVersion } = useEditModeStore();

  // Knife tool state
  const {
    isActive: isKnifeActive,
    cutMode,
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

  // Shared light helper materials (created once per color change)
  const lightHelperMaterials = useMemo(() => {
    if (!isLight) return null;
    const color = isSelected ? '#7C3AED' : (object.lightProps?.color || '#FFFFFF');
    return {
      solid: new THREE.MeshBasicMaterial({ color }),
      wireframe: new THREE.MeshBasicMaterial({ color, wireframe: true }),
      doubleSided: new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    };
  }, [isLight, isSelected, object.lightProps?.color]);

  // Cleanup light helper geometries on unmount
  useEffect(() => {
    return () => {
      Object.values(lightHelperGeometries).forEach(geo => geo.dispose());
    };
  }, [lightHelperGeometries]);

  // Cleanup light helper materials on unmount
  useEffect(() => {
    if (lightHelperMaterials) {
      return () => {
        Object.values(lightHelperMaterials).forEach(mat => mat.dispose());
      };
    }
  }, [lightHelperMaterials]);

  // Create geometry based on object type
  const geometry = useMemo(() => {
    // PRIORITY 1: NEW QMesh Architecture - Use renderGeometry if it exists
    if (object.renderGeometry) {
      console.log(`[SceneObject] Using QMesh renderGeometry for ${object.name}`);

      // CRITICAL: Ensure bounding sphere exists for frustum culling
      // Without this, Three.js will crash when trying to check object visibility
      if (!object.renderGeometry.boundingSphere) {
        object.renderGeometry.computeBoundingSphere();
      }
      if (!object.renderGeometry.boundingBox) {
        object.renderGeometry.computeBoundingBox();
      }

      return object.renderGeometry;
    }

    // PRIORITY 2: DEPRECATED - Check if we have old saved geometry data (for backward compatibility)
    if (object.geometry?.data) {
      console.log(`[SceneObject] Restoring saved geometry for ${object.name} (DEPRECATED)`);
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

      // Sprint Y: Restore userData (includes feature edges)
      if (data.userData) {
        geo.userData = data.userData;
      }

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
      case 'group':
        // Groups are invisible containers, no geometry
        return null;
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [object.type, object.geometryParams, object.importedGeometry, object.geometry, object.renderGeometry]);

  // NEW: Initialize QMesh for objects that don't have it yet
  const initializeGeometryFromBufferGeometry = useObjectsStore(
    (state) => state.initializeGeometryFromBufferGeometry
  );

  useEffect(() => {
    // Only initialize if:
    // 1. We have geometry (created above)
    // 2. We don't have QMesh yet
    // 3. This is not a light or group (they don't have editable geometry)
    // 4. NOT a Boolean operation result (they have arbitrary triangle topology)
    const isBooleanResult = object.name.includes('_union_') || object.name.includes('_minus_') || object.name.includes('_intersect_');

    if (geometry && !object.qMesh && !isLight && object.type !== 'group' && !isBooleanResult) {
      console.log(`[SceneObject] Initializing QMesh for ${object.name}`);
      initializeGeometryFromBufferGeometry(object.id, geometry);
    } else if (isBooleanResult) {
      console.log(`[SceneObject] Skipping QMesh for Boolean result: ${object.name} (using BufferGeometry directly)`);
    }
  }, [object.id, object.name, object.qMesh, geometry, isLight, object.type, initializeGeometryFromBufferGeometry]);

  // Memoize material color separately to prevent full material recreation
  const materialColor = useMemo(() => {
    return isSelected ? '#7C3AED' : '#FFFFFF';
  }, [isSelected]);

  // Create material with PBR properties
  const material = useMemo(() => {
    // Override material based on shading mode
    // In edit mode, always use DoubleSide so faces are visible regardless of winding order
    const editSide = (isEditMode && editingObjectId === object.id) ? THREE.DoubleSide : THREE.FrontSide;

    if (shadingMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: materialColor,
        wireframe: true,
        side: editSide,
      });
    }

    if (shadingMode === 'solid') {
      return new THREE.MeshStandardMaterial({
        color: isSelected ? '#7C3AED' : '#CCCCCC',
        metalness: 0.1,
        roughness: 0.8,
        side: editSide,
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
        side: (assignedMaterial.doubleSided || editSide === THREE.DoubleSide) ? THREE.DoubleSide : THREE.FrontSide,
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
      side: editSide,
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
    isEditMode,
    editingObjectId,
    object.id,
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

  // Cleanup: Dispose geometry on unmount or when it changes
  useEffect(() => {
    const currentGeometry = geometry;

    return () => {
      if (currentGeometry && typeof currentGeometry.dispose === 'function') {
        currentGeometry.dispose();
      }
    };
  }, [geometry]);

  // Cleanup: Dispose material on unmount or when it changes (separate from geometry!)
  useEffect(() => {
    const currentMaterial = material;

    return () => {
      if (currentMaterial && currentMaterial instanceof THREE.Material) {
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
    };
  }, [material]);

  // Helper: Get the root parent (top of hierarchy) for group selection
  const getRootParent = (obj: SceneObjectType): SceneObjectType => {
    let current = obj;
    while (current.parentId) {
      const parent = objects.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current;
  };

  // Handle click
  const handleClick = (event: THREE.Event) => {
    console.log('[SceneObject] Clicked:', object.name, 'Type:', object.type);
    event.stopPropagation();

    // Priority 1: Knife tool (if active in edit mode)
    if (isKnifeActive && isEditMode && editingObjectId === object.id && meshRef.current) {
      // Filter intersections to only use hits on Mesh objects (not lineSegments/helpers)
      const allIntersections = (event as any).intersections || [];
      const intersection = allIntersections.find(
        (i: any) => i.object?.isMesh
      );
      if (intersection) {
        // Snap to QMesh face edges (not BufferGeometry triangulation diagonals)
        const sceneObjForSnap = useObjectsStore.getState().getObject(editingObjectId);
        const qMesh = sceneObjForSnap?.qMesh;

        let snapPoint: THREE.Vector3;

        if (qMesh && intersection.faceIndex !== undefined) {
          // Find the QMesh face from the triangle index
          const qFaceId = qMesh.getFaceIdFromTriangleIndex(intersection.faceIndex);
          const qFace = qFaceId ? qMesh.faces.get(qFaceId) : null;

          if (qFace) {
            // Snap to nearest REAL edge of the QMesh face
            const faceVerts = qFace.getVertices();
            let bestDist = Infinity;
            let bestSnapPoint: THREE.Vector3 | null = null;

            for (let i = 0; i < faceVerts.length; i++) {
              const p0 = faceVerts[i].position.clone();
              const p1 = faceVerts[(i + 1) % faceVerts.length].position.clone();

              // Transform to world space
              meshRef.current.localToWorld(p0);
              meshRef.current.localToWorld(p1);

              const candidate = closestPointOnLine(p0, p1, intersection.point);
              const dist = intersection.point.distanceTo(candidate);

              if (dist < bestDist) {
                bestDist = dist;
                bestSnapPoint = candidate;
              }
            }

            if (bestSnapPoint && bestDist < 0.5) {
              snapPoint = bestSnapPoint;
              console.log('[KnifeTool] Snapped to QMesh edge, dist:', bestDist.toFixed(3));
            } else {
              console.warn('[KnifeTool] Click must be near an edge. Click closer to an edge.');
              return;
            }
          } else {
            console.warn('[KnifeTool] Could not find QMesh face for triangle', intersection.faceIndex);
            return;
          }
        } else {
          // Fallback to BufferGeometry edge snapping
          const nearbyEdge = findNearbyEdge(
            intersection.point,
            meshRef.current.geometry,
            meshRef.current,
            0.5
          );

          if (nearbyEdge) {
            const positions = meshRef.current.geometry.attributes.position;
            const [v0Idx, v1Idx] = nearbyEdge;
            const p0 = new THREE.Vector3().fromBufferAttribute(positions, v0Idx);
            const p1 = new THREE.Vector3().fromBufferAttribute(positions, v1Idx);
            meshRef.current.localToWorld(p0);
            meshRef.current.localToWorld(p1);
            snapPoint = closestPointOnLine(p0, p1, intersection.point);
          } else {
            console.warn('[KnifeTool] Click must be near an edge. Click closer to an edge.');
            return;
          }
        }

        // Validate: second point must be on the same QMesh face
        if (targetFaceIndex !== null && intersection.faceIndex !== targetFaceIndex) {
          const sceneObj = useObjectsStore.getState().getObject(editingObjectId);
          if (sceneObj?.qMesh) {
            const targetQFace = sceneObj.qMesh.getFaceIdFromTriangleIndex(targetFaceIndex);
            const clickedQFace = sceneObj.qMesh.getFaceIdFromTriangleIndex(intersection.faceIndex);
            if (targetQFace && clickedQFace && targetQFace === clickedQFace) {
              console.log('[KnifeTool] Same QMesh face', targetQFace, '- OK');
            } else {
              console.warn('[KnifeTool] Second point must be on the same face!', targetQFace, '!=', clickedQFace);
              return;
            }
          } else {
            console.warn('[KnifeTool] Second point must be on the same face!');
            return;
          }
        }

        // Only accept 2 points max
        if (drawingPath.length >= 2) {
          console.warn('[KnifeTool] Already have 2 points - click Confirm or press Enter');
          return;
        }

        // Add point to cutting path (pass face index for first point)
        addPathPoint(snapPoint, intersection.faceIndex);

        // After second point, calculate intersections and auto-confirm
        if (drawingPath.length === 1) {
          const currentPath = [...drawingPath, snapPoint];
          const intersections = findLineIntersections(
            currentPath[0],
            currentPath[1],
            meshRef.current.geometry,
            meshRef.current
          );

          console.log('[KnifeTool] Total intersections:', intersections.length);
          setIntersectionPoints(intersections);

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
      // If object has a parent (is in a group), select the root parent instead
      const targetObject = getRootParent(object);
      onSelect(targetObject.id, event.nativeEvent.shiftKey || event.nativeEvent.ctrlKey || event.nativeEvent.metaKey);
    }
  };

  if (!object.visible) return null;

  // Get pose mode state for bone rendering
  const { isPoseMode } = useBoneStore();

  // Render bones
  if (object.type === 'bone') {
    return (
      <group position={object.position} rotation={object.rotation} scale={object.scale}>
        <BoneRenderer
          bone={object}
          isSelected={isSelected}
          isPoseMode={isPoseMode}
          onSelect={onSelect}
        />

        {/* Render children recursively (child bones) */}
        {childObjects.map((child) => (
          <SceneObject
            key={child.id}
            object={child}
            isSelected={false}
            onSelect={onSelect}
          />
        ))}
      </group>
    );
  }

  // Render armatures (container for bones - invisible but renders children)
  if (object.type === 'armature') {
    return (
      <group position={object.position} rotation={object.rotation} scale={object.scale}>
        {/* Armature origin indicator */}
        {isSelected && (
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#F59E0B" wireframe />
          </mesh>
        )}

        {/* Render child bones */}
        {childObjects.map((child) => (
          <SceneObject
            key={child.id}
            object={child}
            isSelected={false}
            onSelect={onSelect}
          />
        ))}
      </group>
    );
  }

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
          <group position={object.position} rotation={object.rotation} scale={object.scale}>
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
            <mesh onClick={handleClick} geometry={lightHelperGeometries.pointLightSphere} material={lightHelperMaterials?.solid} />
            {/* Render children recursively */}
            {childObjects.map((child) => (
              <SceneObject
                key={child.id}
                object={child}
                isSelected={false}
                onSelect={onSelect}
              />
            ))}
          </group>
        );

      case 'spotLight':
        return (
          <group position={object.position} rotation={object.rotation} scale={object.scale}>
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
            <mesh onClick={handleClick} geometry={lightHelperGeometries.spotLightCone} material={lightHelperMaterials?.wireframe} />
            {/* Render children recursively */}
            {childObjects.map((child) => (
              <SceneObject
                key={child.id}
                object={child}
                isSelected={false}
                onSelect={onSelect}
              />
            ))}
          </group>
        );

      case 'directionalLight':
        return (
          <group position={object.position} rotation={object.rotation} scale={object.scale}>
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
            <mesh onClick={handleClick} geometry={lightHelperGeometries.directionalLightPlane} material={lightHelperMaterials?.doubleSided} />
            {/* Render children recursively */}
            {childObjects.map((child) => (
              <SceneObject
                key={child.id}
                object={child}
                isSelected={false}
                onSelect={onSelect}
              />
            ))}
          </group>
        );

      case 'ambientLight':
        return (
          <group position={object.position} rotation={object.rotation} scale={object.scale}>
            <ambientLight
              ref={lightRef}
              color={lightColor}
              intensity={lightProps.intensity}
            />
            {/* Helper sphere to visualize ambient light */}
            <mesh onClick={handleClick} geometry={lightHelperGeometries.ambientLightIco} material={lightHelperMaterials?.wireframe} />
            {/* Render children recursively */}
            {childObjects.map((child) => (
              <SceneObject
                key={child.id}
                object={child}
                isSelected={false}
                onSelect={onSelect}
              />
            ))}
          </group>
        );
    }
  }

  // TEMPORARILY DISABLED FOR DEBUGGING - Bounding box causing memory leaks
  // const boundingBoxRef = useRef<THREE.BoxGeometry | null>(null);
  // const invisibleMaterial = useMemo(() => {
  //   return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  // }, []);
  // useEffect(() => {
  //   return () => {
  //     if (invisibleMaterial) {
  //       invisibleMaterial.dispose();
  //     }
  //   };
  // }, [invisibleMaterial]);
  // useEffect(() => {
  //   if (boundingBoxRef.current) {
  //     boundingBoxRef.current.dispose();
  //     boundingBoxRef.current = null;
  //   }
  //   if (!geometry) {
  //     return;
  //   }
  //   geometry.computeBoundingBox();
  //   if (!geometry.boundingBox) {
  //     return;
  //   }
  //   const box = geometry.boundingBox;
  //   const center = new THREE.Vector3();
  //   const size = new THREE.Vector3();
  //   box.getCenter(center);
  //   box.getSize(size);
  //   const boxGeo = new THREE.BoxGeometry(
  //     Math.max(size.x * 1.1, 0.2),
  //     Math.max(size.y * 1.1, 0.2),
  //     Math.max(size.z * 1.1, 0.2)
  //   );
  //   boxGeo.translate(center.x, center.y, center.z);
  //   boundingBoxRef.current = boxGeo;
  //   return () => {
  //     if (boundingBoxRef.current) {
  //       boundingBoxRef.current.dispose();
  //       boundingBoxRef.current = null;
  //     }
  //   };
  // }, [geometry]);

  // Render meshes with hierarchy support
  return (
    <group position={object.position} rotation={object.rotation} scale={object.scale}>
      {/* Render skinned mesh with deformation */}
      {object.skinData && !isEditMode && (
        <SkinnedMeshRenderer meshId={object.id} />
      )}

      {/* Only render mesh if geometry exists (groups have no geometry) */}
      {/* Skip regular mesh rendering for skinned meshes unless in edit mode */}
      {geometry && (!object.skinData || isEditMode) && (
        <>
          <mesh
            ref={meshRef}
            key={`${object.id}-${shadingMode}`}
            geometry={geometry}
            material={material}
            onClick={handleClick}
            userData={{ id: object.id, type: object.type }}
            castShadow
            receiveShadow
          />

          {/* Invisible bounding box for easier selection - TEMPORARILY DISABLED for debugging */}
          {/* {!isEditMode && boundingBoxRef.current && (
            <mesh
              geometry={boundingBoxRef.current}
              material={invisibleMaterial}
              onClick={handleClick}
              visible={false}
            />
          )} */}
        </>
      )}

      {/* Knife tool: Show edges as wireframe overlay */}
      {geometry && isKnifeActive && isEditMode && editingObjectId === object.id && meshRef.current && (
        <>
          {/* Show quad edges if no points selected yet - MEMOIZED to prevent memory leak */}
          {drawingPath.length === 0 && <KnifeWireframe geometry={geometry} />}

          {/* Show only the selected face's edges after first point */}
          {/* Sprint Y: KnifeFaceHighlight now handles quad mode internally */}
          {drawingPath.length === 1 && targetFaceIndex !== null && geometry && (
            <KnifeFaceHighlight
              geometry={geometry}
              faceIndex={targetFaceIndex}
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
            />
          )}
        </>
      )}

      {/* Edit mode helpers for vertex/edge/face selection */}
      {/* Sprint 10: Force re-mount when geometry changes (knife cuts) */}
      {geometry && isEditMode && editingObjectId === object.id && !isKnifeActive && meshRef.current && (
        <EditModeHelpers
          key={`edit-helpers-${object.id}-v${geometryVersion}`}
          mesh={meshRef.current}
          objectId={object.id}
        />
      )}

      {/* Render children recursively - children inherit parent transform */}
      {childObjects.map((child) => (
        <SceneObject
          key={child.id}
          object={child}
          isSelected={false}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
