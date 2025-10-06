/**
 * Transform Gizmo Component
 *
 * Provides transform controls (translate, rotate, scale) for selected objects.
 * Now supports hierarchical transforms - operates in world space, stores in local space.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useObjectsStore } from '../../stores/objectsStore';
import { useCommandStore } from '../../stores/commandStore';
import { TransformObjectCommand } from '../../lib/commands/ObjectCommands';
import {
  getWorldPosition,
  getWorldRotation,
  getWorldScale,
  setWorldPosition,
  setWorldRotation,
  setWorldScale,
} from '../../lib/hierarchy/TransformUtils';

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

  // Calculate world transforms for the gizmo (updates when object or hierarchy changes)
  const worldTransform = useMemo(() => {
    if (!selectedObject) return null;

    return {
      position: getWorldPosition(selectedObject.id),
      rotation: getWorldRotation(selectedObject.id),
      scale: getWorldScale(selectedObject.id),
    };
  }, [selectedObject?.id, selectedObject?.position, selectedObject?.rotation, selectedObject?.scale, selectedObject?.parentId]);

  useEffect(() => {
    if (controlsRef.current && selectedObject) {
      const controls = controlsRef.current;

      const handleChangeStart = () => {
        // Store the old LOCAL value when transform starts
        const property = transformMode === 'translate' ? 'position' : transformMode === 'rotate' ? 'rotation' : 'scale';
        oldValue.current = [...selectedObject[property]];
      };

      const handleChange = () => {
        if (!controls.object) return;

        // Get new world transform from controls
        const property = transformMode === 'translate' ? 'position' : transformMode === 'rotate' ? 'rotation' : 'scale';

        let newLocalValue: [number, number, number];

        if (transformMode === 'translate') {
          // Convert world position to local position
          const worldPos = new THREE.Vector3(
            controls.object.position.x,
            controls.object.position.y,
            controls.object.position.z
          );
          newLocalValue = setWorldPosition(selectedObject.id, worldPos);
        } else if (transformMode === 'rotate') {
          // Convert world rotation to local rotation
          const worldRot = new THREE.Euler(
            controls.object.rotation.x,
            controls.object.rotation.y,
            controls.object.rotation.z
          );
          newLocalValue = setWorldRotation(selectedObject.id, worldRot);
        } else {
          // scale
          const worldScale = new THREE.Vector3(
            controls.object.scale.x,
            controls.object.scale.y,
            controls.object.scale.z
          );
          newLocalValue = setWorldScale(selectedObject.id, worldScale);
        }

        // Update object with new local value
        updateObject(selectedObject.id, { [property]: newLocalValue });
      };

      const handleChangeEnd = () => {
        if (!controls.object) return;

        // Get final local value for command
        const property = transformMode === 'translate' ? 'position' : transformMode === 'rotate' ? 'rotation' : 'scale';
        const newValue = [...selectedObject[property]] as [number, number, number];

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
  }, [selectedObject, transformMode, updateObject, executeCommand, worldTransform]);

  if (!selectedObject || !worldTransform) return null;

  return (
    <TransformControls
      ref={controlsRef}
      mode={transformMode}
      position={worldTransform.position.toArray()}
      rotation={worldTransform.rotation.toArray()}
      scale={worldTransform.scale.toArray()}
      camera={camera}
      gl={gl}
    />
  );
}
