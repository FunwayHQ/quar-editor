/**
 * Animation Store
 *
 * Manages keyframe animations, tracks, and playback state.
 * Sprint 6: Animation System & Timeline
 * Extended for bone animations in Bones & Skeletal Animation Sprint
 */

import { create } from 'zustand';
import type { BonePose } from './objectsStore';

// Interpolation types
export type InterpolationType = 'linear' | 'bezier' | 'step';

// Keyframe interface
export interface Keyframe {
  id: string;
  time: number;              // Time in seconds
  value: any;                // Value at this keyframe (number, vector3, color, etc.)
  interpolation: InterpolationType;
  easing?: [number, number, number, number]; // Cubic bezier control points for 'bezier' mode
  space?: 'local' | 'world'; // Coordinate space (local = relative to parent, world = absolute)
}

// Animation track (one property of one object)
export interface AnimationTrack {
  id: string;
  objectId: string;          // Which object is being animated
  property: string;          // 'position', 'rotation', 'scale', 'materialProperty', 'shapeKey', 'boneTransform'
  propertyPath: string[];    // Path to the property e.g., ['position', 'x'] or ['lightProps', 'intensity'] or ['shapeKey', 'shapeKeyId']
  keyframes: Keyframe[];
  enabled: boolean;
  color?: string;            // Track color in timeline UI
  shapeKeyId?: string;       // For shape key tracks

  // Bone animation properties
  boneId?: string;                           // Which bone is being animated (for bone tracks)
  transformType?: 'position' | 'rotation' | 'scale';  // What transform property
  space?: 'local' | 'pose';                  // Local = relative to parent, Pose = relative to rest
}

// Animation (collection of tracks)
export interface Animation {
  id: string;
  name: string;
  duration: number;          // Duration in seconds
  tracks: AnimationTrack[];
  loop: boolean;
  enabled: boolean;
  createdAt: number;
  modifiedAt: number;
}

// Pose library for storing and reusing bone poses
export interface PoseLibrary {
  id: string;
  name: string;
  poses: Map<string, StoredPose>;
}

export interface StoredPose {
  id: string;
  name: string;
  bonePoses: Map<string, BonePose>;     // boneId -> pose
  thumbnail?: string;                    // Base64 encoded image
  createdAt: number;
}

// Animation state
export interface AnimationState {
  // Animations collection
  animations: Map<string, Animation>;
  activeAnimationId: string | null;

  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;       // Current playhead time in seconds
  playbackSpeed: number;     // 0.5 = half speed, 2 = double speed
  frameRate: 24 | 30 | 60;  // Frames per second

  // Timeline settings
  autoKeyframe: boolean;     // Auto-create keyframes on property change
  snapToKeyframes: boolean;  // Snap scrubber to nearest keyframe
  timelineZoom: number;      // Pixels per second (zoom level)
  timelineScroll: number;    // Horizontal scroll position

  // Animation management
  createAnimation: (name: string, duration?: number) => Animation;
  deleteAnimation: (id: string) => void;
  getAnimation: (id: string) => Animation | undefined;
  setActiveAnimation: (id: string | null) => void;
  updateAnimation: (id: string, updates: Partial<Animation>) => void;

  // Track management
  addTrack: (animationId: string, track: AnimationTrack) => void;
  removeTrack: (animationId: string, trackId: string) => void;
  updateTrack: (animationId: string, trackId: string, updates: Partial<AnimationTrack>) => void;
  getTrack: (animationId: string, trackId: string) => AnimationTrack | undefined;

  // Keyframe management
  addKeyframe: (animationId: string, trackId: string, keyframe: Keyframe) => void;
  removeKeyframe: (animationId: string, trackId: string, keyframeId: string) => void;
  updateKeyframe: (animationId: string, trackId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
  getKeyframe: (animationId: string, trackId: string, keyframeId: string) => Keyframe | undefined;

  // Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setFrameRate: (frameRate: 24 | 30 | 60) => void;
  toggleLoop: () => void;

  // Timeline controls
  setAutoKeyframe: (enabled: boolean) => void;
  setSnapToKeyframes: (enabled: boolean) => void;
  setTimelineZoom: (zoom: number) => void;
  setTimelineScroll: (scroll: number) => void;

  // Serialization
  serialize: () => any;
  deserialize: (data: any) => void;
}

// Helper to generate unique IDs
function generateId(): string {
  return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Counter for auto-naming
let animationCounter = 0;

export const useAnimationStore = create<AnimationState>((set, get) => ({
  // Initial state
  animations: new Map(),
  activeAnimationId: null,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  playbackSpeed: 1,
  frameRate: 30,
  autoKeyframe: false,
  snapToKeyframes: true,
  timelineZoom: 100, // 100 pixels per second
  timelineScroll: 0,

  // Animation management
  createAnimation: (name, duration = 5) => {
    animationCounter++;
    const now = Date.now();
    const animation: Animation = {
      id: generateId(),
      name: name || `Animation ${animationCounter.toString().padStart(3, '0')}`,
      duration,
      tracks: [],
      loop: false,
      enabled: true,
      createdAt: now,
      modifiedAt: now,
    };

    set((state) => {
      const newAnimations = new Map(state.animations);
      newAnimations.set(animation.id, animation);
      return {
        animations: newAnimations,
        activeAnimationId: animation.id, // Auto-select new animation
      };
    });

    return animation;
  },

  deleteAnimation: (id) => set((state) => {
    const newAnimations = new Map(state.animations);
    newAnimations.delete(id);
    return {
      animations: newAnimations,
      activeAnimationId: state.activeAnimationId === id ? null : state.activeAnimationId,
    };
  }),

  getAnimation: (id) => {
    return get().animations.get(id);
  },

  setActiveAnimation: (id) => set({ activeAnimationId: id }),

  updateAnimation: (id, updates) => set((state) => {
    const animation = state.animations.get(id);
    if (!animation) return state;

    const newAnimations = new Map(state.animations);
    newAnimations.set(id, {
      ...animation,
      ...updates,
      modifiedAt: Date.now(),
    });
    return { animations: newAnimations };
  }),

  // Track management
  addTrack: (animationId, track) => set((state) => {
    const animation = state.animations.get(animationId);
    if (!animation) return state;

    const newAnimations = new Map(state.animations);
    newAnimations.set(animationId, {
      ...animation,
      tracks: [...animation.tracks, track],
      modifiedAt: Date.now(),
    });
    return { animations: newAnimations };
  }),

  removeTrack: (animationId, trackId) => set((state) => {
    const animation = state.animations.get(animationId);
    if (!animation) return state;

    const newAnimations = new Map(state.animations);
    newAnimations.set(animationId, {
      ...animation,
      tracks: animation.tracks.filter(t => t.id !== trackId),
      modifiedAt: Date.now(),
    });
    return { animations: newAnimations };
  }),

  updateTrack: (animationId, trackId, updates) => set((state) => {
    const animation = state.animations.get(animationId);
    if (!animation) return state;

    const newAnimations = new Map(state.animations);
    newAnimations.set(animationId, {
      ...animation,
      tracks: animation.tracks.map(t =>
        t.id === trackId ? { ...t, ...updates } : t
      ),
      modifiedAt: Date.now(),
    });
    return { animations: newAnimations };
  }),

  getTrack: (animationId, trackId) => {
    const animation = get().animations.get(animationId);
    if (!animation) return undefined;
    return animation.tracks.find(t => t.id === trackId);
  },

  // Keyframe management
  addKeyframe: (animationId, trackId, keyframe) => set((state) => {
    const animation = state.animations.get(animationId);
    if (!animation) return state;

    // Ensure keyframe has space property (default to 'local' for new keyframes)
    const keyframeWithSpace: Keyframe = {
      ...keyframe,
      space: keyframe.space ?? 'local', // Default to local space
    };

    const newAnimations = new Map(state.animations);
    newAnimations.set(animationId, {
      ...animation,
      tracks: animation.tracks.map(track => {
        if (track.id !== trackId) return track;

        // Check if keyframe already exists at this time (within 0.01s tolerance)
        const existingIndex = track.keyframes.findIndex(kf => Math.abs(kf.time - keyframe.time) < 0.01);

        if (existingIndex >= 0) {
          // Update existing keyframe instead of adding duplicate
          const updatedKeyframes = [...track.keyframes];
          updatedKeyframes[existingIndex] = { ...updatedKeyframes[existingIndex], value: keyframe.value, space: keyframeWithSpace.space };
          return { ...track, keyframes: updatedKeyframes };
        } else {
          // Add new keyframe and sort
          return {
            ...track,
            keyframes: [...track.keyframes, keyframeWithSpace].sort((a, b) => a.time - b.time),
          };
        }
      }),
      modifiedAt: Date.now(),
    });
    return { animations: newAnimations };
  }),

  removeKeyframe: (animationId, trackId, keyframeId) => set((state) => {
    const animation = state.animations.get(animationId);
    if (!animation) return state;

    const newAnimations = new Map(state.animations);
    newAnimations.set(animationId, {
      ...animation,
      tracks: animation.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              keyframes: track.keyframes.filter(k => k.id !== keyframeId),
            }
          : track
      ),
      modifiedAt: Date.now(),
    });
    return { animations: newAnimations };
  }),

  updateKeyframe: (animationId, trackId, keyframeId, updates) => set((state) => {
    const animation = state.animations.get(animationId);
    if (!animation) return state;

    const newAnimations = new Map(state.animations);
    newAnimations.set(animationId, {
      ...animation,
      tracks: animation.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              keyframes: track.keyframes
                .map(k => k.id === keyframeId ? { ...k, ...updates } : k)
                .sort((a, b) => a.time - b.time), // Re-sort after time change
            }
          : track
      ),
      modifiedAt: Date.now(),
    });
    return { animations: newAnimations };
  }),

  getKeyframe: (animationId, trackId, keyframeId) => {
    const track = get().getTrack(animationId, trackId);
    if (!track) return undefined;
    return track.keyframes.find(k => k.id === keyframeId);
  },

  // Playback controls
  play: () => set({ isPlaying: true, isPaused: false }),
  pause: () => set({ isPlaying: false, isPaused: true }),
  stop: () => set({ isPlaying: false, isPaused: false, currentTime: 0 }),

  setCurrentTime: (time) => set((state) => {
    const animation = state.activeAnimationId ? state.animations.get(state.activeAnimationId) : null;
    const maxTime = animation?.duration || 5;
    return { currentTime: Math.max(0, Math.min(time, maxTime)) };
  }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.1, Math.min(speed, 4)) }),
  setFrameRate: (frameRate) => set({ frameRate }),

  toggleLoop: () => set((state) => {
    const animationId = state.activeAnimationId;
    if (!animationId) return state;

    const animation = state.animations.get(animationId);
    if (!animation) return state;

    const newAnimations = new Map(state.animations);
    newAnimations.set(animationId, {
      ...animation,
      loop: !animation.loop,
    });
    return { animations: newAnimations };
  }),

  // Timeline controls
  setAutoKeyframe: (enabled) => set({ autoKeyframe: enabled }),
  setSnapToKeyframes: (enabled) => set({ snapToKeyframes: enabled }),
  setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(20, Math.min(zoom, 500)) }),
  setTimelineScroll: (scroll) => set({ timelineScroll: Math.max(0, scroll) }),

  // Serialization
  serialize: () => {
    const state = get();
    return {
      animations: Array.from(state.animations.values()),
      activeAnimationId: state.activeAnimationId,
    };
  },

  deserialize: (data: any) => {
    if (!data) {
      console.warn('[animationStore] Invalid data for deserialization');
      return;
    }

    set(() => {
      const newAnimations = new Map<string, Animation>();

      if (data.animations) {
        data.animations.forEach((anim: Animation) => {
          newAnimations.set(anim.id, anim);
        });
      }

      return {
        animations: newAnimations,
        activeAnimationId: data.activeAnimationId || null,
      };
    });

    if (data.activeAnimationId) {
      get().setActiveAnimation(data.activeAnimationId);
    }
  },
}));
