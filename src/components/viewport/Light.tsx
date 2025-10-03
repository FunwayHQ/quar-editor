/**
 * Light Component
 *
 * Renders different types of lights in the scene.
 */

import React, { useRef } from 'react';
import * as THREE from 'three';
import { SceneObject } from '../../stores/objectsStore';

interface LightProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
}

export function Light({ object, isSelected, onSelect }: LightProps) {
  const lightRef = useRef<THREE.Light>(null);

  if (!object.visible || !object.lightProps) return null;

  const { color, intensity, distance, decay, castShadow } = object.lightProps;
  const lightColor = new THREE.Color(color);

  // Handle click (for selection)
  const handleClick = (event: THREE.Event) => {
    event.stopPropagation();
    onSelect(object.id, event.nativeEvent.shiftKey || event.nativeEvent.ctrlKey || event.nativeEvent.metaKey);
  };

  // Configure shadow settings
  const configureShadows = (light: THREE.Light) => {
    if (castShadow && 'shadow' in light) {
      light.castShadow = true;
      const shadow = (light as any).shadow;
      if (shadow) {
        const mapSize = object.lightProps?.shadowMapSize || 1024;
        shadow.mapSize.width = mapSize;
        shadow.mapSize.height = mapSize;
        shadow.bias = object.lightProps?.shadowBias || -0.0001;
        shadow.radius = object.lightProps?.shadowRadius || 1;
      }
    }
  };

  switch (object.type) {
    case 'pointLight':
      return (
        <pointLight
          ref={lightRef as any}
          position={object.position}
          color={lightColor}
          intensity={intensity}
          distance={distance}
          decay={decay}
          castShadow={castShadow}
          onPointerDown={handleClick as any}
        />
      );

    case 'spotLight':
      const { angle, penumbra, target } = object.lightProps;
      return (
        <>
          <spotLight
            ref={lightRef as any}
            position={object.position}
            color={lightColor}
            intensity={intensity}
            distance={distance}
            angle={angle}
            penumbra={penumbra}
            decay={decay}
            castShadow={castShadow}
            target-position={target}
            onPointerDown={handleClick as any}
          />
        </>
      );

    case 'directionalLight':
      return (
        <directionalLight
          ref={lightRef as any}
          position={object.position}
          color={lightColor}
          intensity={intensity}
          castShadow={castShadow}
          target-position={object.lightProps.target}
          onPointerDown={handleClick as any}
        />
      );

    case 'ambientLight':
      return (
        <ambientLight
          ref={lightRef as any}
          color={lightColor}
          intensity={intensity}
        />
      );

    default:
      return null;
  }
}
