/**
 * Animation Engine
 *
 * Core animation playback engine with keyframe evaluation.
 * Sprint 6: Animation System & Timeline
 */

import { Animation, AnimationTrack, Keyframe } from '../../stores/animationStore';
import { getValueAtTime } from './Interpolators';
import { useObjectsStore } from '../../stores/objectsStore';

/**
 * Animation Engine - Handles playback and property updates
 */
export class AnimationEngine {
  private rafId: number | null = null;
  private lastTime: number = 0;
  private startTime: number = 0;
  private cachedTrackValues: Map<string, any> = new Map();

  /**
   * Start playing an animation
   */
  start(
    animation: Animation,
    currentTime: number,
    onTimeUpdate: (time: number) => void,
    onComplete: () => void,
    playbackSpeed: number = 1
  ): void {
    if (this.rafId !== null) {
      this.stop();
    }

    this.startTime = performance.now() - (currentTime * 1000 / playbackSpeed);
    this.lastTime = performance.now();
    this.cachedTrackValues.clear();

    const tick = (now: number) => {
      if (!animation.enabled) {
        this.stop();
        return;
      }

      const elapsed = ((now - this.startTime) / 1000) * playbackSpeed; // Convert to seconds and apply speed
      let newTime = elapsed;

      // Handle looping
      if (newTime >= animation.duration) {
        if (animation.loop) {
          newTime = newTime % animation.duration;
          this.startTime = now - (newTime * 1000 / playbackSpeed);
        } else {
          newTime = animation.duration;
          onTimeUpdate(newTime);
          this.applyAnimationAtTime(animation, newTime);
          onComplete();
          this.stop();
          return;
        }
      }

      // Update time and apply animation
      onTimeUpdate(newTime);
      this.applyAnimationAtTime(animation, newTime);

      this.lastTime = now;
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Stop playing
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Apply animation state at a specific time
   */
  applyAnimationAtTime(animation: Animation, time: number): void {
    // Batch all updates together for better performance
    const updates: Map<string, any> = new Map();

    animation.tracks.forEach((track) => {
      if (!track.enabled) return;

      const value = getValueAtTime(track.keyframes, time);
      if (value === null) return;

      // Check cache to avoid unnecessary updates
      const cacheKey = `${track.objectId}_${track.propertyPath.join('_')}`;
      const cachedValue = this.cachedTrackValues.get(cacheKey);

      if (JSON.stringify(cachedValue) === JSON.stringify(value)) {
        return; // Skip if value hasn't changed
      }

      this.cachedTrackValues.set(cacheKey, value);

      // Collect updates per object
      if (!updates.has(track.objectId)) {
        updates.set(track.objectId, {});
      }

      const objectUpdates = updates.get(track.objectId);
      this.buildPropertyUpdate(track, value, objectUpdates);
    });

    // Apply all updates in a single batch
    const objectsStore = useObjectsStore.getState();
    updates.forEach((objectUpdates, objectId) => {
      objectsStore.updateObject(objectId, objectUpdates);
    });
  }

  /**
   * Build property update object for a track value
   */
  private buildPropertyUpdate(track: AnimationTrack, value: any, targetUpdates: any): void {
    // Handle nested property paths
    if (track.propertyPath.length === 1) {
      // Simple property like 'visible'
      targetUpdates[track.propertyPath[0]] = value;
    } else if (track.propertyPath.length === 2) {
      // Nested property like ['position', 'x']
      const parentProp = track.propertyPath[0];
      const childProp = track.propertyPath[1];

      // Get current parent value from the object
      const objectsStore = useObjectsStore.getState();
      const object = objectsStore.getObject(track.objectId);
      if (!object) return;

      const currentValue = (object as any)[parentProp];

      if (Array.isArray(currentValue) && currentValue.length === 3) {
        // Vector3 property
        const newValue: [number, number, number] = targetUpdates[parentProp] || [...currentValue] as [number, number, number];
        const index = childProp === 'x' ? 0 : childProp === 'y' ? 1 : 2;
        newValue[index] = value;
        targetUpdates[parentProp] = newValue;
      } else if (typeof currentValue === 'object') {
        // Object property (like lightProps)
        targetUpdates[parentProp] = {
          ...(targetUpdates[parentProp] || currentValue),
          [childProp]: value,
        };
      }
    } else {
      // Full property replacement (position, rotation, scale as vector)
      targetUpdates[track.property] = value;
    }
  }

  /**
   * Seek to a specific time without playing
   */
  seekTo(animation: Animation, time: number): void {
    this.applyAnimationAtTime(animation, time);
  }

  /**
   * Check if engine is currently playing
   */
  isPlaying(): boolean {
    return this.rafId !== null;
  }
}

// Singleton instance
let engineInstance: AnimationEngine | null = null;

/**
 * Get the singleton animation engine instance
 */
export function getAnimationEngine(): AnimationEngine {
  if (!engineInstance) {
    engineInstance = new AnimationEngine();
  }
  return engineInstance;
}
