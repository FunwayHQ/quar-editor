/**
 * Edit Mode Helpers Component
 *
 * Renders visual helpers for vertex, edge, and face selection in edit mode.
 * Sprint 7: Export System + Polygon Editing MVP
 * REFACTORED: Now uses QMesh string IDs
 */

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useEditModeStore, makeEdgeKey } from '../../stores/editModeStore';
import { useObjectsStore } from '../../stores/objectsStore';

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
    geometryVersion, // Sprint 10: Force re-render when geometry changes (knife cuts)
  } = useEditModeStore();

  // Get the SceneObject to access qMesh
  const { objects } = useObjectsStore();
  const sceneObject = objects.get(objectId);
  const qMesh = sceneObject?.qMesh;

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

  // Require QMesh for visualization
  if (!qMesh) return null;

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
    const goldFace = new THREE.MeshBasicMaterial({ color: "#FFD700", side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const purpleWireframe = new THREE.LineBasicMaterial({ color: "#7C3AED", opacity: 0.3, transparent: true, depthTest: false, depthWrite: false });

    materialsRef.current.push(goldGlow, yellow, purpleDark, goldSolid, purpleGlow, purpleDarkEdge, yellowEdge, invisible, goldFace, purpleWireframe);

    return { goldGlow, yellow, purpleDark, goldSolid, purpleGlow, purpleDarkEdge, yellowEdge, invisible, goldFace, purpleWireframe };
  }, []);

  // Create vertex helpers (REFACTORED for QMesh)
  const vertexHelpers = useMemo(() => {
    if (selectionMode !== 'vertex' || !qMesh) return null;

    const vertices: JSX.Element[] = [];

    // Iterate over QMesh vertices
    qMesh.vertices.forEach((vertex) => {
      const { x, y, z } = vertex.position;
      const isSelected = selectedVertices.has(vertex.id);

      const handleVertexClick = (event: any, vertexId: string) => {
        event.stopPropagation();
        const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
        toggleVertexSelection(vertexId, multiSelect);
      };

      if (isSelected) {
        // Selected vertex with glow effect
        vertices.push(
          <group key={`vertex-${vertex.id}`}>
            {/* Outer glow */}
            <mesh
              position={[x, y, z]}
              onClick={(e) => handleVertexClick(e, vertex.id)}
              geometry={sharedVertexGeometries.outerGlow}
              material={sharedMaterials.goldGlow}
            />
            {/* Core sphere */}
            <mesh
              position={[x, y, z]}
              onClick={(e) => handleVertexClick(e, vertex.id)}
              geometry={sharedVertexGeometries.coreSphere}
              material={sharedMaterials.yellow}
            />
          </group>
        );
      } else {
        // Unselected vertex - subtle
        vertices.push(
          <mesh
            key={`vertex-${vertex.id}`}
            position={[x, y, z]}
            onClick={(e) => handleVertexClick(e, vertex.id)}
            geometry={sharedVertexGeometries.unselectedSphere}
            material={sharedMaterials.purpleDark}
          />
        );
      }
    });

    return <>{vertices}</>;
  }, [selectionMode, qMesh, selectedVertices, toggleVertexSelection, sharedVertexGeometries, sharedMaterials]);

  // Create edge helpers (REFACTORED for QMesh)
  const edgeHelpers = useMemo(() => {
    if (selectionMode !== 'edge' || !qMesh) return null;

    const edges: JSX.Element[] = [];

    // Get all edges from QMesh (no need for quad detection!)
    const qMeshEdges = qMesh.getEdges();

    // Create edge lines using cylinders for better visibility
    qMeshEdges.forEach(({ v1, v2, edgeKey }) => {
      const isSelected = selectedEdges.has(edgeKey);

      const point1 = v1.position.clone();
      const point2 = v2.position.clone();

      // Calculate edge length and midpoint
      const edgeLength = point1.distanceTo(point2);
      const midpoint = new THREE.Vector3().lerpVectors(point1, point2, 0.5);

      // Calculate rotation to align cylinder with edge
      const direction = new THREE.Vector3().subVectors(point2, point1).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      );

      const handleEdgeClick = (event: any, v1Id: string, v2Id: string) => {
        event.stopPropagation();
        const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
        toggleEdgeSelection(v1Id, v2Id, multiSelect);
      };

      if (isSelected) {
        // Create a thick cylinder for selected edges
        // Sprint Y: Reduced edge thickness (50% smaller)
        const outerCyl = getCylinderGeometry(0.0125, 0.0125, edgeLength, 8); // Was 0.025
        const coreCyl = getCylinderGeometry(0.0075, 0.0075, edgeLength, 8);  // Was 0.015

        edges.push(
          <group key={`edge-${edgeKey}-group`}>
            {/* Outer glow cylinder */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1.id, v2.id)}
              geometry={outerCyl}
              material={sharedMaterials.goldGlow}
            />

            {/* Core cylinder */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1.id, v2.id)}
              geometry={coreCyl}
              material={sharedMaterials.yellowEdge}
            />

            {/* Endpoint spheres for emphasis */}
            <mesh position={point1} onClick={(e) => handleEdgeClick(e, v1.id, v2.id)} geometry={sharedVertexGeometries.edgeEndpoint} material={sharedMaterials.goldSolid} />
            <mesh position={point2} onClick={(e) => handleEdgeClick(e, v1.id, v2.id)} geometry={sharedVertexGeometries.edgeEndpoint} material={sharedMaterials.goldSolid} />
          </group>
        );
      } else {
        // Clickable overlay for unselected edges
        // Sprint Y: Reduced sizes (50% smaller)
        const clickCyl = getCylinderGeometry(0.01, 0.01, edgeLength, 8);   // Was 0.02
        const visibleCyl = getCylinderGeometry(0.004, 0.004, edgeLength, 6); // Was 0.008

        edges.push(
          <group key={`edge-${edgeKey}`}>
            {/* Invisible thick cylinder for easier clicking */}
            <mesh
              position={midpoint}
              onClick={(e) => handleEdgeClick(e, v1.id, v2.id)}
              quaternion={quaternion}
              geometry={clickCyl}
              material={sharedMaterials.invisible}
            />

            {/* Visible thin purple line */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1.id, v2.id)}
              geometry={visibleCyl}
              material={sharedMaterials.purpleGlow}
            />

            {/* Endpoint spheres for better visibility */}
            <mesh position={point1} onClick={(e) => handleEdgeClick(e, v1.id, v2.id)} geometry={sharedVertexGeometries.edgeEndpointSmall} material={sharedMaterials.purpleDarkEdge} />
            <mesh position={point2} onClick={(e) => handleEdgeClick(e, v1.id, v2.id)} geometry={sharedVertexGeometries.edgeEndpointSmall} material={sharedMaterials.purpleDarkEdge} />
          </group>
        );
      }
    });

    return <>{edges}</>;
  }, [selectionMode, qMesh, selectedEdges, toggleEdgeSelection, sharedVertexGeometries, sharedMaterials, getCylinderGeometry, geometryVersion]);

  // Create face helpers (REFACTORED for QMesh - supports quads and N-gons!)
  const faceHelpers = useMemo(() => {
    if (selectionMode !== 'face' || !qMesh) return null;

    const faces: JSX.Element[] = [];

    // Iterate over QMesh faces
    qMesh.faces.forEach((face) => {
      const isSelected = selectedFaces.has(face.id);

      // Only visualize selected faces
      if (!isSelected) return;

      const handleFaceClick = (event: any, faceId: string) => {
        event.stopPropagation();
        const multiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
        toggleFaceSelection(faceId, multiSelect);
      };

      // Get face vertices
      const vertices = face.getVertices();
      if (vertices.length < 3) return;

      // Create geometry for this face (triangulate for rendering)
      const faceGeometry = new THREE.BufferGeometry();
      geometriesRef.current.push(faceGeometry); // Track for disposal

      // Triangulate the face using fan triangulation
      const positions: number[] = [];
      const normals: number[] = [];

      // Calculate face normal
      const normal = face.calculateNormal();

      // Fan triangulation from first vertex
      for (let i = 1; i < vertices.length - 1; i++) {
        // Triangle: v0, vi, vi+1
        positions.push(...vertices[0].position.toArray());
        positions.push(...vertices[i].position.toArray());
        positions.push(...vertices[i + 1].position.toArray());

        // Same normal for all vertices in this triangle
        normals.push(...normal.toArray());
        normals.push(...normal.toArray());
        normals.push(...normal.toArray());
      }

      faceGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      faceGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));

      faces.push(
        <mesh
          key={`face-${face.id}`}
          onClick={(e) => handleFaceClick(e, face.id)}
          geometry={faceGeometry}
          material={sharedMaterials.goldFace}
        />
      );
    });

    return <>{faces}</>;
  }, [selectionMode, qMesh, selectedFaces, toggleFaceSelection, sharedMaterials.goldFace]);

  // Create edges geometry for face mode wireframe (REFACTORED for QMesh)
  const edgesGeometry = useMemo(() => {
    if (selectionMode !== 'face' || !qMesh) return null;

    // Get all edges from QMesh
    const edges = qMesh.getEdges();

    // Create BufferGeometry with edges
    const edgesGeo = new THREE.BufferGeometry();
    const edgePositions: number[] = [];

    edges.forEach(({ v1, v2 }) => {
      edgePositions.push(
        ...v1.position.toArray(),
        ...v2.position.toArray()
      );
    });

    edgesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    geometriesRef.current.push(edgesGeo); // Track for disposal

    return edgesGeo;
  }, [selectionMode, qMesh, geometryVersion]);

  // Add wireframe overlay for better face visibility in face mode
  const wireframeOverlay = useMemo(() => {
    if (selectionMode !== 'face' || !edgesGeometry) return null;

    return (
      <lineSegments geometry={edgesGeometry} material={sharedMaterials.purpleWireframe} />
    );
  }, [selectionMode, edgesGeometry, sharedMaterials.purpleWireframe]);

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