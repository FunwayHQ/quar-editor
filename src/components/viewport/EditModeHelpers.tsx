/**
 * Edit Mode Helpers Component
 *
 * Renders visual helpers for vertex, edge, and face selection in edit mode.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useEditModeStore, makeEdgeKey } from '../../stores/editModeStore';
import { getQuadEdges } from '../../lib/geometry/EdgeFiltering';

interface EditModeHelpersProps {
  mesh: THREE.Mesh;
  objectId: string;
}

export function EditModeHelpers({ mesh, objectId }: EditModeHelpersProps) {
  const {
    editingObjectId,
    selectionMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    toggleVertexSelection,
    toggleEdgeSelection,
    toggleFaceSelection,
  } = useEditModeStore();

  // Track created geometries and materials for disposal
  const geometriesRef = useRef<THREE.BufferGeometry[]>([]);
  const materialsRef = useRef<THREE.Material[]>([]);
  const cylinderCacheRef = useRef<Map<string, THREE.CylinderGeometry>>(new Map());

  // Cleanup geometries and materials on unmount or selection change
  useEffect(() => {
    return () => {
      // Dispose all tracked geometries
      geometriesRef.current.forEach(geo => geo.dispose());
      geometriesRef.current = [];

      // Dispose all tracked materials
      materialsRef.current.forEach(mat => mat.dispose());
      materialsRef.current = [];

      // Dispose cylinder cache
      cylinderCacheRef.current.forEach(geo => geo.dispose());
      cylinderCacheRef.current.clear();
    };
  }, [selectedFaces, selectedVertices, selectedEdges, selectionMode]);

  // Helper to get/create cached cylinder geometry
  const getCylinderGeometry = (radiusTop: number, radiusBottom: number, length: number, segments: number) => {
    // Round length to nearest 0.1 to reuse similar cylinders
    const roundedLength = Math.round(length * 10) / 10;
    const key = `${radiusTop}-${radiusBottom}-${roundedLength}-${segments}`;

    if (!cylinderCacheRef.current.has(key)) {
      const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, roundedLength, segments);
      cylinderCacheRef.current.set(key, geo);
    }

    return cylinderCacheRef.current.get(key)!;
  };

  // Only show helpers for the object being edited
  if (editingObjectId !== objectId) return null;

  const geometry = mesh.geometry as THREE.BufferGeometry;
  if (!geometry) return null;

  // Get vertex positions
  const positions = geometry.getAttribute('position');
  if (!positions) return null;

  // Create shared geometries for vertex helpers (reused, not recreated)
  const sharedVertexGeometries = useMemo(() => {
    // Sprint Y: Reduced sizes for better precision (50% smaller)
    const outerGlow = new THREE.SphereGeometry(0.03, 8, 8);        // Was 0.06
    const coreSphere = new THREE.SphereGeometry(0.02, 12, 12);     // Was 0.04
    const unselectedSphere = new THREE.SphereGeometry(0.01, 6, 6); // Was 0.02
    const edgeEndpoint = new THREE.SphereGeometry(0.015, 8, 8);    // Was 0.03
    const edgeEndpointSmall = new THREE.SphereGeometry(0.008, 6, 6); // Was 0.015

    geometriesRef.current.push(outerGlow, coreSphere, unselectedSphere, edgeEndpoint, edgeEndpointSmall);

    return { outerGlow, coreSphere, unselectedSphere, edgeEndpoint, edgeEndpointSmall };
  }, []);

  // Create shared materials (reused, not recreated)
  const sharedMaterials = useMemo(() => {
    const goldGlow = new THREE.MeshBasicMaterial({ color: "#FFD700", transparent: true, opacity: 0.3 });
    const yellow = new THREE.MeshBasicMaterial({ color: "#FFFF00" });
    const purpleDark = new THREE.MeshBasicMaterial({ color: "#6B46C1", transparent: true, opacity: 0.6 });
    const goldSolid = new THREE.MeshBasicMaterial({ color: "#FFD700" });
    const purpleGlow = new THREE.MeshBasicMaterial({ color: "#7C3AED", transparent: true, opacity: 0.4 });
    const purpleDarkEdge = new THREE.MeshBasicMaterial({ color: "#6B46C1", transparent: true, opacity: 0.5 });
    const yellowEdge = new THREE.MeshBasicMaterial({ color: "#FFFF00", transparent: true, opacity: 0.9 });
    const invisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false });

    materialsRef.current.push(goldGlow, yellow, purpleDark, goldSolid, purpleGlow, purpleDarkEdge, yellowEdge, invisible);

    return { goldGlow, yellow, purpleDark, goldSolid, purpleGlow, purpleDarkEdge, yellowEdge, invisible };
  }, []);

  // Create vertex helpers
  const vertexHelpers = useMemo(() => {
    if (selectionMode !== 'vertex') return null;

    const vertices: JSX.Element[] = [];
    const vertexCount = positions.count;

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const isSelected = selectedVertices.has(i);

      const handleVertexClick = (event: any, index: number) => {
        event.stopPropagation();
        const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
        toggleVertexSelection(index, multiSelect);
      };

      if (isSelected) {
        // Selected vertex with glow effect
        vertices.push(
          <group key={`vertex-${i}`}>
            {/* Outer glow */}
            <mesh
              position={[x, y, z]}
              onClick={(e) => handleVertexClick(e, i)}
              geometry={sharedVertexGeometries.outerGlow}
              material={sharedMaterials.goldGlow}
            />
            {/* Core sphere */}
            <mesh
              position={[x, y, z]}
              onClick={(e) => handleVertexClick(e, i)}
              geometry={sharedVertexGeometries.coreSphere}
              material={sharedMaterials.yellow}
            />
          </group>
        );
      } else {
        // Unselected vertex - subtle
        vertices.push(
          <mesh
            key={`vertex-${i}`}
            position={[x, y, z]}
            onClick={(e) => handleVertexClick(e, i)}
            geometry={sharedVertexGeometries.unselectedSphere}
            material={sharedMaterials.purpleDark}
          />
        );
      }
    }

    return <>{vertices}</>;
  }, [selectionMode, positions, selectedVertices, toggleVertexSelection, sharedVertexGeometries]);

  // Create edge helpers
  const edgeHelpers = useMemo(() => {
    if (selectionMode !== 'edge') return null;

    const edges: JSX.Element[] = [];

    // Sprint Y: Use quad edge filtering to hide triangulation diagonals
    const quadEdgesList = getQuadEdges(geometry);

    // Build edge map from quad edges only (no diagonals!)
    const edgeMap = new Map<string, [number, number]>();
    quadEdgesList.forEach(([v1, v2]) => {
      const key = makeEdgeKey(v1, v2);
      edgeMap.set(key, [v1, v2]);
    });

    // Create edge lines using cylinders for better visibility
    edgeMap.forEach(([v1, v2], key) => {
      const isSelected = selectedEdges.has(key);

      const point1 = new THREE.Vector3(
        positions.getX(v1),
        positions.getY(v1),
        positions.getZ(v1)
      );
      const point2 = new THREE.Vector3(
        positions.getX(v2),
        positions.getY(v2),
        positions.getZ(v2)
      );

      // Calculate edge length and midpoint
      const edgeLength = point1.distanceTo(point2);
      const midpoint = new THREE.Vector3().lerpVectors(point1, point2, 0.5);

      // Calculate rotation to align cylinder with edge
      const direction = new THREE.Vector3().subVectors(point2, point1).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      );

      const handleEdgeClick = (event: any, v1: number, v2: number) => {
        event.stopPropagation();
        const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
        toggleEdgeSelection(v1, v2, multiSelect);
      };

      if (isSelected) {
        // Create a thick cylinder for selected edges
        // Sprint Y: Reduced edge thickness (50% smaller)
        const outerCyl = getCylinderGeometry(0.0125, 0.0125, edgeLength, 8); // Was 0.025
        const coreCyl = getCylinderGeometry(0.0075, 0.0075, edgeLength, 8);  // Was 0.015

        edges.push(
          <group key={`edge-${key}-group`}>
            {/* Outer glow cylinder */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
              geometry={outerCyl}
              material={sharedMaterials.goldGlow}
            />

            {/* Core cylinder */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
              geometry={coreCyl}
              material={sharedMaterials.yellowEdge}
            />

            {/* Endpoint spheres for emphasis */}
            <mesh position={point1} onClick={(e) => handleEdgeClick(e, v1, v2)} geometry={sharedVertexGeometries.edgeEndpoint} material={sharedMaterials.goldSolid} />
            <mesh position={point2} onClick={(e) => handleEdgeClick(e, v1, v2)} geometry={sharedVertexGeometries.edgeEndpoint} material={sharedMaterials.goldSolid} />
          </group>
        );
      } else {
        // Clickable overlay for unselected edges
        // Sprint Y: Reduced sizes (50% smaller)
        const clickCyl = getCylinderGeometry(0.01, 0.01, edgeLength, 8);   // Was 0.02
        const visibleCyl = getCylinderGeometry(0.004, 0.004, edgeLength, 6); // Was 0.008

        edges.push(
          <group key={`edge-${key}`}>
            {/* Invisible thick cylinder for easier clicking */}
            <mesh
              position={midpoint}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
              quaternion={quaternion}
              geometry={clickCyl}
              material={sharedMaterials.invisible}
            />

            {/* Visible thin purple line */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
              geometry={visibleCyl}
              material={sharedMaterials.purpleGlow}
            />

            {/* Endpoint spheres for better visibility */}
            <mesh position={point1} onClick={(e) => handleEdgeClick(e, v1, v2)} geometry={sharedVertexGeometries.edgeEndpointSmall} material={sharedMaterials.purpleDarkEdge} />
            <mesh position={point2} onClick={(e) => handleEdgeClick(e, v1, v2)} geometry={sharedVertexGeometries.edgeEndpointSmall} material={sharedMaterials.purpleDarkEdge} />
          </group>
        );
      }
    });

    return <>{edges}</>;
  }, [selectionMode, geometry, positions, selectedEdges, toggleEdgeSelection, sharedVertexGeometries, sharedMaterials, getCylinderGeometry]);

  // Create face helpers
  const faceHelpers = useMemo(() => {
    if (selectionMode !== 'face') return null;

    const faces: JSX.Element[] = [];
    const indices = geometry.index;

    if (indices) {
      const indexArray = indices.array;
      const faceCount = indexArray.length / 3;

      for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
        const i = faceIndex * 3;
        const a = indexArray[i];
        const b = indexArray[i + 1];
        const c = indexArray[i + 2];

        const isSelected = selectedFaces.has(faceIndex);

        const handleFaceClick = (event: any, fIndex: number) => {
          event.stopPropagation();
          const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
          toggleFaceSelection(fIndex, multiSelect);
        };

        if (isSelected) {
          // Create a highlighted face overlay
          const faceVertices = [
            new THREE.Vector3(
              positions.getX(a),
              positions.getY(a),
              positions.getZ(a)
            ),
            new THREE.Vector3(
              positions.getX(b),
              positions.getY(b),
              positions.getZ(b)
            ),
            new THREE.Vector3(
              positions.getX(c),
              positions.getY(c),
              positions.getZ(c)
            ),
          ];

          const faceGeometry = new THREE.BufferGeometry();
          geometriesRef.current.push(faceGeometry); // Track for disposal

          const vertices = new Float32Array([
            ...faceVertices[0].toArray(),
            ...faceVertices[1].toArray(),
            ...faceVertices[2].toArray(),
          ]);
          faceGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

          // Calculate face normal for proper lighting
          const normal = new THREE.Vector3();
          const edge1 = faceVertices[1].clone().sub(faceVertices[0]);
          const edge2 = faceVertices[2].clone().sub(faceVertices[0]);
          normal.crossVectors(edge1, edge2).normalize();

          const normals = new Float32Array([
            ...normal.toArray(),
            ...normal.toArray(),
            ...normal.toArray(),
          ]);
          faceGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

          faces.push(
            <mesh
              key={`face-${faceIndex}`}
              onClick={(e) => handleFaceClick(e, faceIndex)}
            >
              <bufferGeometry attach="geometry" {...faceGeometry} />
              <meshBasicMaterial
                color="#FFD700"  // Gold for selected
                side={THREE.DoubleSide}
                transparent
                opacity={0.4}
              />
            </mesh>
          );
        }
      }
    } else {
      // Non-indexed geometry
      const vertexCount = positions.count;
      const faceCount = vertexCount / 3;

      for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
        const i = faceIndex * 3;

        const isSelected = selectedFaces.has(faceIndex);

        if (isSelected) {
          const faceVertices = [
            new THREE.Vector3(
              positions.getX(i),
              positions.getY(i),
              positions.getZ(i)
            ),
            new THREE.Vector3(
              positions.getX(i + 1),
              positions.getY(i + 1),
              positions.getZ(i + 1)
            ),
            new THREE.Vector3(
              positions.getX(i + 2),
              positions.getY(i + 2),
              positions.getZ(i + 2)
            ),
          ];

          const faceGeometry = new THREE.BufferGeometry();
          geometriesRef.current.push(faceGeometry); // Track for disposal

          const vertices = new Float32Array([
            ...faceVertices[0].toArray(),
            ...faceVertices[1].toArray(),
            ...faceVertices[2].toArray(),
          ]);
          faceGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

          // Calculate face normal
          const normal = new THREE.Vector3();
          const edge1 = faceVertices[1].clone().sub(faceVertices[0]);
          const edge2 = faceVertices[2].clone().sub(faceVertices[0]);
          normal.crossVectors(edge1, edge2).normalize();

          const normals = new Float32Array([
            ...normal.toArray(),
            ...normal.toArray(),
            ...normal.toArray(),
          ]);
          faceGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

          faces.push(
            <mesh key={`face-${faceIndex}`}>
              <bufferGeometry attach="geometry" {...faceGeometry} />
              <meshBasicMaterial
                color="#FFD700"  // Gold for selected
                side={THREE.DoubleSide}
                depthTest={false}
                depthWrite={false}
                transparent
                opacity={0.4}
              />
            </mesh>
          );
        }
      }
    }

    return <>{faces}</>;
  }, [selectionMode, geometry, positions, selectedFaces, toggleFaceSelection]);

  // Create edges geometry for face mode wireframe (Sprint Y: Use quad edges only!)
  const edgesGeometry = useMemo(() => {
    if (selectionMode !== 'face') return null;

    // Use quad edge filtering to hide triangulation diagonals
    const quadEdgesList = getQuadEdges(geometry);

    // Create BufferGeometry with quad edges only
    const edgesGeo = new THREE.BufferGeometry();
    const edgePositions: number[] = [];

    quadEdgesList.forEach(([v0, v1]) => {
      edgePositions.push(
        positions.getX(v0), positions.getY(v0), positions.getZ(v0),
        positions.getX(v1), positions.getY(v1), positions.getZ(v1)
      );
    });

    edgesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    geometriesRef.current.push(edgesGeo); // Track for disposal

    return edgesGeo;
  }, [selectionMode, geometry, positions]);

  // Add wireframe overlay for better face visibility in face mode
  const wireframeOverlay = useMemo(() => {
    if (selectionMode !== 'face' || !edgesGeometry) return null;

    return (
      <lineSegments>
        <primitive object={edgesGeometry} attach="geometry" />
        <lineBasicMaterial
          color="#7C3AED"
          opacity={0.3}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </lineSegments>
    );
  }, [selectionMode, edgesGeometry]);

  return (
    <group
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
    >
      {vertexHelpers}
      {edgeHelpers}
      {faceHelpers}
      {wireframeOverlay}
    </group>
  );
}