/**
 * Scene Serializer Service
 *
 * Centralized service for serializing and deserializing the entire scene state.
 * This decouples serialization logic from UI components and coordinates across all stores.
 */

import { useObjectsStore } from '../stores/objectsStore';
import { useMaterialsStore } from '../stores/materialsStore';
import { useAnimationStore } from '../stores/animationStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { useMorphTargetStore } from '../stores/morphTargetStore';
import { useCurveStore } from '../stores/curveStore';

/**
 * Serialize the entire scene state from all stores
 */
export function serializeScene(): any {
  const objectsState = useObjectsStore.getState();
  const materialsState = useMaterialsStore.getState();
  const animationState = useAnimationStore.getState();
  const envState = useEnvironmentStore.getState();
  const morphState = useMorphTargetStore.getState();
  const curveState = useCurveStore.getState();

  return {
    objects: objectsState.serialize(),
    materials: materialsState.serialize(),
    animations: animationState.serialize(),
    environment: envState.serialize(),
    shapeKeys: morphState.serializeShapeKeys(),
    basePoses: morphState.serializeBasePoses(),
    curves: curveState.serialize(),
  };
}

/**
 * Deserialize scene data into all stores
 */
export function deserializeScene(sceneData: any): void {
  if (!sceneData) {
    console.warn('[sceneSerializer] No scene data to deserialize');
    return;
  }

  // Deserialize in order of dependencies
  // 1. Objects (base layer)
  if (sceneData.objects) {
    useObjectsStore.getState().deserialize(sceneData.objects);
  }

  // 2. Materials
  if (sceneData.materials) {
    useMaterialsStore.getState().deserialize(sceneData.materials);
  }

  // 3. Animations
  if (sceneData.animations) {
    useAnimationStore.getState().deserialize(sceneData.animations);
  }

  // 4. Environment
  if (sceneData.environment) {
    useEnvironmentStore.getState().deserialize(sceneData.environment);
  }

  // 5. Shape keys and base poses
  if (sceneData.shapeKeys) {
    useMorphTargetStore.getState().deserializeShapeKeys(sceneData.shapeKeys);
  }
  if (sceneData.basePoses) {
    useMorphTargetStore.getState().deserializeBasePoses(sceneData.basePoses);
  }

  // 6. Curves
  if (sceneData.curves) {
    useCurveStore.getState().deserialize(sceneData.curves);
  }

  console.log('[sceneSerializer] Scene data restored from storage');
}
