/**
 * Transform Gizmo Component
 *
 * Provides transform controls (translate, rotate, scale) for selected objects.
 */

import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { TransformObjectCommand } from '../../lib/commands/ObjectCommands';

export function TransformGizmo() {
  const { camera, gl } = useThree();
  const transformMode = useObjectsStore((state) => state.transformMode);
  const selectedIds = useObjectsStore((state) => state.selectedIds);
  const getObject = useObjectsStore((state) => state.getObject);
  const updateObject = useObjectsStore((state) => state.updateObject);
  const executeCommand = useCommandStore((state) => state.executeCommand);

  const controlsRef = useRef<any>(null);
  const oldValue = useRef<[number, number, number]>([0, 0, 0]);

  // Get the first selected object (for now, we only transform one at a time)
  const selectedObject = selectedIds.length > 0 ? getObject(selectedIds[0]) : null;

  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;

      const handleChangeStart = () => {
        if (!selectedObject) return;

        // Store the old value when transform starts
        const property = transformMode === 'translate' ? 'position' : transformMode === 'rotate' ? 'rotation' : 'scale';
        oldValue.current = [...selectedObject[property]];
      };

      const handleChange = () => {
        if (!selectedObject || !controls.object) return;

        // Update object in store as user drags
        const property = transformMode === 'translate' ? 'position' : transformMode === 'rotate' ? 'rotation' : 'scale';
        const newValue: [number, number, number] = [
          controls.object[property].x,
          controls.object[property].y,
          controls.object[property].z,
        ];

        updateObject(selectedObject.id, { [property]: newValue });
      };

      const handleChangeEnd = () => {
        if (!selectedObject || !controls.object) return;

        // Create command for undo/redo
        const property = transformMode === 'translate' ? 'position' : transformMode === 'rotate' ? 'rotation' : 'scale';
        const newValue: [number, number, number] = [
          controls.object[property].x,
          controls.object[property].y,
          controls.object[property].z,
        ];

        const command = new TransformObjectCommand(
          selectedObject.id,
          property,
          oldValue.current,
          newValue
        );
        executeCommand(command);
      };

      controls.addEventListener('change', handleChange);
      controls.addEventListener('dragging-changed', (event: any) => {
        if (event.value) {
          handleChangeStart();
        } else {
          handleChangeEnd();
        }
      });

      return () => {
        controls.removeEventListener('change', handleChange);
        controls.removeEventListener('dragging-changed', handleChangeStart);
      };
    }
  }, [selectedObject, transformMode, updateObject, executeCommand]);

  if (!selectedObject) return null;

  return (
    <TransformControls
      ref={controlsRef}
      mode={transformMode}
      position={selectedObject.position}
      rotation={selectedObject.rotation}
      scale={selectedObject.scale}
      camera={camera}
      gl={gl}
    />
  );
}
