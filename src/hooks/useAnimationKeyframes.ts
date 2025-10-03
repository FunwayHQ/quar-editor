/**
 * Animation Keyframes Hook
 *
 * Hook for creating keyframes when object properties change.
 * Sprint 6: Animation System & Timeline
 */

import { useEffect, useRef } from 'react';
import { useAnimationStore, AnimationTrack, Keyframe } from '../stores/animationStore';
import { useObjectsStore, SceneObject } from '../stores/objectsStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper to create a keyframe for an object property
 */
export function createKeyframeForProperty(
  objectId: string,
  property: string,
  propertyPath: string[],
  value: any,
  time: number,
  interpolation: 'linear' | 'bezier' | 'step' = 'linear'
): { track: AnimationTrack; keyframe: Keyframe } {
  const trackId = `track_${objectId}_${propertyPath.join('_')}`;

  const track: AnimationTrack = {
    id: trackId,
    objectId,
    property,
    propertyPath,
    keyframes: [],
    enabled: true,
    color: getTrackColor(property),
  };

  const keyframe: Keyframe = {
    id: `kf_${uuidv4()}`,
    time,
    value,
    interpolation,
  };

  return { track, keyframe };
}

/**
 * Get a color for a track based on property type
 */
function getTrackColor(property: string): string {
  switch (property) {
    case 'position':
      return '#10B981'; // Green
    case 'rotation':
      return '#3B82F6'; // Blue
    case 'scale':
      return '#F59E0B'; // Orange
    case 'lightProps':
      return '#EC4899'; // Pink
    default:
      return '#7C3AED'; // Purple
  }
}

/**
 * Hook to enable auto-keyframing
 * Watches for object property changes and creates keyframes automatically
 */
export function useAnimationKeyframes() {
  const {
    activeAnimationId,
    animations,
    autoKeyframe,
    currentTime,
    addTrack,
    addKeyframe,
    getTrack,
  } = useAnimationStore();

  const objects = useObjectsStore((state) => state.objects);
  const previousObjectsRef = useRef<Map<string, SceneObject>>(new Map());

  useEffect(() => {
    if (!autoKeyframe || !activeAnimationId) {
      previousObjectsRef.current = new Map(objects);
      return;
    }

    const activeAnimation = animations.get(activeAnimationId);
    if (!activeAnimation) return;

    // Compare current objects with previous
    objects.forEach((currentObj, objectId) => {
      const previousObj = previousObjectsRef.current.get(objectId);
      if (!previousObj) return;

      // Check position changes
      if (JSON.stringify(currentObj.position) !== JSON.stringify(previousObj.position)) {
        createOrUpdateKeyframe(
          activeAnimationId,
          objectId,
          'position',
          ['position'],
          currentObj.position
        );
      }

      // Check rotation changes
      if (JSON.stringify(currentObj.rotation) !== JSON.stringify(previousObj.rotation)) {
        createOrUpdateKeyframe(
          activeAnimationId,
          objectId,
          'rotation',
          ['rotation'],
          currentObj.rotation
        );
      }

      // Check scale changes
      if (JSON.stringify(currentObj.scale) !== JSON.stringify(previousObj.scale)) {
        createOrUpdateKeyframe(
          activeAnimationId,
          objectId,
          'scale',
          ['scale'],
          currentObj.scale
        );
      }

      // Check light properties changes (if it's a light)
      if (currentObj.lightProps && previousObj.lightProps) {
        if (currentObj.lightProps.intensity !== previousObj.lightProps.intensity) {
          createOrUpdateKeyframe(
            activeAnimationId,
            objectId,
            'lightProps',
            ['lightProps', 'intensity'],
            currentObj.lightProps.intensity
          );
        }

        if (currentObj.lightProps.color !== previousObj.lightProps.color) {
          createOrUpdateKeyframe(
            activeAnimationId,
            objectId,
            'lightProps',
            ['lightProps', 'color'],
            currentObj.lightProps.color
          );
        }
      }
    });

    // Update previous state
    previousObjectsRef.current = new Map(objects);
  }, [objects, autoKeyframe, activeAnimationId, currentTime]);

  function createOrUpdateKeyframe(
    animationId: string,
    objectId: string,
    property: string,
    propertyPath: string[],
    value: any
  ) {
    const trackId = `track_${objectId}_${propertyPath.join('_')}`;
    let track = getTrack(animationId, trackId);

    // Create track if it doesn't exist
    if (!track) {
      const { track: newTrack } = createKeyframeForProperty(
        objectId,
        property,
        propertyPath,
        value,
        currentTime
      );
      addTrack(animationId, newTrack);
      // Get fresh track reference after adding
      track = getTrack(animationId, trackId);
      if (!track) return; // Safety check
    }

    // Check if keyframe already exists at current time
    const existingKeyframe = track.keyframes.find(kf => Math.abs(kf.time - currentTime) < 0.01);

    if (!existingKeyframe) {
      // Create new keyframe
      const keyframe: Keyframe = {
        id: `kf_${uuidv4()}`,
        time: currentTime,
        value,
        interpolation: 'linear',
      };

      addKeyframe(animationId, trackId, keyframe);
    }
  }
}
