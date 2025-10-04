/**
 * Edit Mode Helpers Component
 *
 * Renders visual helpers for vertex, edge, and face selection in edit mode.
 * Sprint 7: Export System + Polygon Editing MVP
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useEditModeStore, makeEdgeKey } from '../../stores/editModeStore';

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

  // Only show helpers for the object being edited
  if (editingObjectId !== objectId) return null;

  const geometry = mesh.geometry as THREE.BufferGeometry;
  if (!geometry) return null;

  // Get vertex positions
  const positions = geometry.getAttribute('position');
  if (!positions) return null;

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
            >
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial
                color="#FFD700"
                transparent
                opacity={0.3}
              />
            </mesh>
            {/* Core sphere */}
            <mesh
              position={[x, y, z]}
              onClick={(e) => handleVertexClick(e, i)}
            >
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial
                color="#FFFF00"
              />
            </mesh>
          </group>
        );
      } else {
        // Unselected vertex - subtle
        vertices.push(
          <mesh
            key={`vertex-${i}`}
            position={[x, y, z]}
            onClick={(e) => handleVertexClick(e, i)}
          >
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshBasicMaterial
              color="#6B46C1"  // Darker purple
              transparent
              opacity={0.6}
            />
          </mesh>
        );
      }
    }

    return <>{vertices}</>;
  }, [selectionMode, positions, selectedVertices, toggleVertexSelection]);

  // Create edge helpers
  const edgeHelpers = useMemo(() => {
    if (selectionMode !== 'edge') return null;

    const edges: JSX.Element[] = [];
    const edgeMap = new Map<string, [number, number]>();

    // Build edge map from faces
    const indices = geometry.index;
    if (indices) {
      const indexArray = indices.array;
      for (let i = 0; i < indexArray.length; i += 3) {
        const a = indexArray[i];
        const b = indexArray[i + 1];
        const c = indexArray[i + 2];

        // Add edges (always in sorted order to avoid duplicates)
        const edges = [
          [a, b],
          [b, c],
          [c, a],
        ];

        for (const [v1, v2] of edges) {
          const key = makeEdgeKey(v1 as number, v2 as number);
          if (!edgeMap.has(key)) {
            edgeMap.set(key, [v1 as number, v2 as number]);
          }
        }
      }
    } else {
      // Non-indexed geometry
      const vertexCount = positions.count;
      for (let i = 0; i < vertexCount; i += 3) {
        const edges = [
          [i, i + 1],
          [i + 1, i + 2],
          [i + 2, i],
        ];

        for (const [v1, v2] of edges) {
          const key = makeEdgeKey(v1, v2);
          if (!edgeMap.has(key)) {
            edgeMap.set(key, [v1, v2]);
          }
        }
      }
    }

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
        edges.push(
          <group key={`edge-${key}-group`}>
            {/* Outer glow cylinder */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
            >
              <cylinderGeometry args={[0.025, 0.025, edgeLength, 8]} />
              <meshBasicMaterial
                color="#FFD700"
                transparent
                opacity={0.3}
              />
            </mesh>

            {/* Core cylinder */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
            >
              <cylinderGeometry args={[0.015, 0.015, edgeLength, 8]} />
              <meshBasicMaterial
                color="#FFFF00"
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Endpoint spheres for emphasis */}
            <mesh position={point1} onClick={(e) => handleEdgeClick(e, v1, v2)}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#FFD700" />
            </mesh>
            <mesh position={point2} onClick={(e) => handleEdgeClick(e, v1, v2)}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#FFD700" />
            </mesh>
          </group>
        );
      } else {
        // Clickable overlay for unselected edges - larger and more visible
        edges.push(
          <group key={`edge-${key}`}>
            {/* Invisible thick cylinder for easier clicking */}
            <mesh
              position={midpoint}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
              quaternion={quaternion}
            >
              <cylinderGeometry args={[0.02, 0.02, edgeLength, 8]} />
              <meshBasicMaterial
                transparent
                opacity={0}
                depthTest={false}
              />
            </mesh>

            {/* Visible thin purple line */}
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onClick={(e) => handleEdgeClick(e, v1, v2)}
            >
              <cylinderGeometry args={[0.008, 0.008, edgeLength, 6]} />
              <meshBasicMaterial
                color="#7C3AED"
                transparent
                opacity={0.4}
              />
            </mesh>

            {/* Endpoint spheres for better visibility */}
            <mesh position={point1} onClick={(e) => handleEdgeClick(e, v1, v2)}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshBasicMaterial
                color="#6B46C1"
                transparent
                opacity={0.5}
              />
            </mesh>
            <mesh position={point2} onClick={(e) => handleEdgeClick(e, v1, v2)}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshBasicMaterial
                color="#6B46C1"
                transparent
                opacity={0.5}
              />
            </mesh>
          </group>
        );
      }
    });

    return <>{edges}</>;
  }, [selectionMode, geometry, positions, selectedEdges, toggleEdgeSelection]);

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

    // Add wireframe overlay for better face visibility
    return (
      <>
        {faces}
        {selectionMode === 'face' && (
          <lineSegments>
            <edgesGeometry attach="geometry" args={[geometry]} />
            <lineBasicMaterial
              color="#7C3AED"
              opacity={0.3}
              transparent
              depthTest={false}
              depthWrite={false}
            />
          </lineSegments>
        )}
      </>
    );
  }, [selectionMode, geometry, positions, selectedFaces, toggleFaceSelection]);

  return (
    <group
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
    >
      {vertexHelpers}
      {edgeHelpers}
      {faceHelpers}
    </group>
  );
}