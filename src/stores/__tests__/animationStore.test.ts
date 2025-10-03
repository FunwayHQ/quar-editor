/**
 * Animation Store Unit Tests
 * Sprint 6: Animation System & Timeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../animationStore';

describe('animationStore', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      animations: new Map(),
      activeAnimationId: null,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      playbackSpeed: 1,
      frameRate: 30,
      autoKeyframe: false,
      snapToKeyframes: true,
      timelineZoom: 100,
      timelineScroll: 0,
    });
  });

  describe('Animation Management', () => {
    it('should create an animation', () => {
      const animation = useAnimationStore.getState().createAnimation('Test Animation');

      expect(animation.name).toBe('Test Animation');
      expect(animation.duration).toBe(5);
      expect(animation.tracks).toHaveLength(0);
      expect(animation.loop).toBe(false);
      expect(animation.enabled).toBe(true);
    });

    it('should auto-set active animation when created', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      expect(useAnimationStore.getState().activeAnimationId).toBe(animation.id);
    });

    it('should generate unique animation IDs', () => {
      const anim1 = useAnimationStore.getState().createAnimation('Anim 1');
      const anim2 = useAnimationStore.getState().createAnimation('Anim 2');

      expect(anim1.id).not.toBe(anim2.id);
    });

    it('should create animation with custom duration', () => {
      const animation = useAnimationStore.getState().createAnimation('Test', 10);

      expect(animation.duration).toBe(10);
    });

    it('should delete an animation', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      useAnimationStore.getState().deleteAnimation(animation.id);

      const retrieved = useAnimationStore.getState().getAnimation(animation.id);
      expect(retrieved).toBeUndefined();
    });

    it('should clear active animation when deleted', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      useAnimationStore.getState().deleteAnimation(animation.id);

      expect(useAnimationStore.getState().activeAnimationId).toBeNull();
    });

    it('should update animation properties', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      useAnimationStore.getState().updateAnimation(animation.id, {
        name: 'Updated Name',
        duration: 10,
        loop: true,
      });

      const updated = useAnimationStore.getState().getAnimation(animation.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.duration).toBe(10);
      expect(updated?.loop).toBe(true);
    });

    it('should set active animation', () => {
      const anim1 = useAnimationStore.getState().createAnimation('Anim 1');
      const anim2 = useAnimationStore.getState().createAnimation('Anim 2');

      useAnimationStore.getState().setActiveAnimation(anim1.id);
      expect(useAnimationStore.getState().activeAnimationId).toBe(anim1.id);

      useAnimationStore.getState().setActiveAnimation(anim2.id);
      expect(useAnimationStore.getState().activeAnimationId).toBe(anim2.id);
    });
  });

  describe('Track Management', () => {
    it('should add track to animation', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);

      const updated = useAnimationStore.getState().getAnimation(animation.id);
      expect(updated?.tracks).toHaveLength(1);
      expect(updated?.tracks[0]).toEqual(track);
    });

    it('should remove track from animation', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);
      useAnimationStore.getState().removeTrack(animation.id, track.id);

      const updated = useAnimationStore.getState().getAnimation(animation.id);
      expect(updated?.tracks).toHaveLength(0);
    });

    it('should update track properties', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);
      useAnimationStore.getState().updateTrack(animation.id, track.id, { enabled: false });

      const updated = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(updated?.enabled).toBe(false);
    });

    it('should get track by ID', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);

      const retrieved = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(retrieved).toEqual(track);
    });
  });

  describe('Keyframe Management', () => {
    it('should add keyframe to track', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);

      const keyframe = {
        id: 'kf_1',
        time: 1.0,
        value: [5, 0, 0],
        interpolation: 'linear' as const,
      };

      useAnimationStore.getState().addKeyframe(animation.id, track.id, keyframe);

      const updated = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(updated?.keyframes).toHaveLength(1);
      expect(updated?.keyframes[0]).toEqual(keyframe);
    });

    it('should sort keyframes by time when adding', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);

      // Add keyframes out of order
      useAnimationStore.getState().addKeyframe(animation.id, track.id, {
        id: 'kf_2',
        time: 2.0,
        value: [2, 0, 0],
        interpolation: 'linear',
      });

      useAnimationStore.getState().addKeyframe(animation.id, track.id, {
        id: 'kf_1',
        time: 1.0,
        value: [1, 0, 0],
        interpolation: 'linear',
      });

      const updated = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(updated?.keyframes[0].time).toBe(1.0);
      expect(updated?.keyframes[1].time).toBe(2.0);
    });

    it('should remove keyframe from track', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);

      const keyframe = {
        id: 'kf_1',
        time: 1.0,
        value: [5, 0, 0],
        interpolation: 'linear' as const,
      };

      useAnimationStore.getState().addKeyframe(animation.id, track.id, keyframe);
      useAnimationStore.getState().removeKeyframe(animation.id, track.id, keyframe.id);

      const updated = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(updated?.keyframes).toHaveLength(0);
    });

    it('should update keyframe properties', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);

      const keyframe = {
        id: 'kf_1',
        time: 1.0,
        value: [5, 0, 0],
        interpolation: 'linear' as const,
      };

      useAnimationStore.getState().addKeyframe(animation.id, track.id, keyframe);
      useAnimationStore.getState().updateKeyframe(animation.id, track.id, keyframe.id, {
        time: 2.0,
        value: [10, 0, 0],
      });

      const updated = useAnimationStore.getState().getKeyframe(animation.id, track.id, keyframe.id);
      expect(updated?.time).toBe(2.0);
      expect(updated?.value).toEqual([10, 0, 0]);
    });

    it('should re-sort keyframes after time update', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, track);

      useAnimationStore.getState().addKeyframe(animation.id, track.id, {
        id: 'kf_1',
        time: 1.0,
        value: [1, 0, 0],
        interpolation: 'linear',
      });

      useAnimationStore.getState().addKeyframe(animation.id, track.id, {
        id: 'kf_2',
        time: 2.0,
        value: [2, 0, 0],
        interpolation: 'linear',
      });

      // Update first keyframe to have later time
      useAnimationStore.getState().updateKeyframe(animation.id, track.id, 'kf_1', { time: 3.0 });

      const updated = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(updated?.keyframes[0].id).toBe('kf_2'); // Now first
      expect(updated?.keyframes[1].id).toBe('kf_1'); // Now second
    });
  });

  describe('Playback Controls', () => {
    it('should start playing', () => {
      useAnimationStore.getState().play();

      expect(useAnimationStore.getState().isPlaying).toBe(true);
      expect(useAnimationStore.getState().isPaused).toBe(false);
    });

    it('should pause', () => {
      useAnimationStore.getState().play();
      useAnimationStore.getState().pause();

      expect(useAnimationStore.getState().isPlaying).toBe(false);
      expect(useAnimationStore.getState().isPaused).toBe(true);
    });

    it('should stop and reset to zero', () => {
      useAnimationStore.getState().setCurrentTime(2.5);
      useAnimationStore.getState().play();
      useAnimationStore.getState().stop();

      expect(useAnimationStore.getState().isPlaying).toBe(false);
      expect(useAnimationStore.getState().isPaused).toBe(false);
      expect(useAnimationStore.getState().currentTime).toBe(0);
    });

    it('should set current time', () => {
      useAnimationStore.getState().setCurrentTime(3.5);

      expect(useAnimationStore.getState().currentTime).toBe(3.5);
    });

    it('should clamp current time to animation duration', () => {
      const animation = useAnimationStore.getState().createAnimation('Test', 5);

      useAnimationStore.getState().setCurrentTime(10);
      expect(useAnimationStore.getState().currentTime).toBe(5);

      useAnimationStore.getState().setCurrentTime(-1);
      expect(useAnimationStore.getState().currentTime).toBe(0);
    });

    it('should set playback speed', () => {
      useAnimationStore.getState().setPlaybackSpeed(2);

      expect(useAnimationStore.getState().playbackSpeed).toBe(2);
    });

    it('should clamp playback speed between 0.1 and 4', () => {
      useAnimationStore.getState().setPlaybackSpeed(10);
      expect(useAnimationStore.getState().playbackSpeed).toBe(4);

      useAnimationStore.getState().setPlaybackSpeed(0.05);
      expect(useAnimationStore.getState().playbackSpeed).toBe(0.1);
    });

    it('should set frame rate', () => {
      useAnimationStore.getState().setFrameRate(60);
      expect(useAnimationStore.getState().frameRate).toBe(60);

      useAnimationStore.getState().setFrameRate(24);
      expect(useAnimationStore.getState().frameRate).toBe(24);
    });

    it('should toggle loop mode', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      useAnimationStore.getState().toggleLoop();
      const updated1 = useAnimationStore.getState().getAnimation(animation.id);
      expect(updated1?.loop).toBe(true);

      useAnimationStore.getState().toggleLoop();
      const updated2 = useAnimationStore.getState().getAnimation(animation.id);
      expect(updated2?.loop).toBe(false);
    });
  });

  describe('Timeline Controls', () => {
    it('should toggle auto-keyframe', () => {
      useAnimationStore.getState().setAutoKeyframe(true);
      expect(useAnimationStore.getState().autoKeyframe).toBe(true);

      useAnimationStore.getState().setAutoKeyframe(false);
      expect(useAnimationStore.getState().autoKeyframe).toBe(false);
    });

    it('should toggle snap to keyframes', () => {
      useAnimationStore.getState().setSnapToKeyframes(false);
      expect(useAnimationStore.getState().snapToKeyframes).toBe(false);

      useAnimationStore.getState().setSnapToKeyframes(true);
      expect(useAnimationStore.getState().snapToKeyframes).toBe(true);
    });

    it('should set timeline zoom', () => {
      useAnimationStore.getState().setTimelineZoom(200);
      expect(useAnimationStore.getState().timelineZoom).toBe(200);
    });

    it('should clamp timeline zoom between 20 and 500', () => {
      useAnimationStore.getState().setTimelineZoom(1000);
      expect(useAnimationStore.getState().timelineZoom).toBe(500);

      useAnimationStore.getState().setTimelineZoom(10);
      expect(useAnimationStore.getState().timelineZoom).toBe(20);
    });

    it('should set timeline scroll', () => {
      useAnimationStore.getState().setTimelineScroll(50);
      expect(useAnimationStore.getState().timelineScroll).toBe(50);
    });

    it('should not allow negative timeline scroll', () => {
      useAnimationStore.getState().setTimelineScroll(-10);
      expect(useAnimationStore.getState().timelineScroll).toBe(0);
    });
  });

  describe('Complete Animation Workflow', () => {
    it('should create animation with tracks and keyframes', () => {
      const animation = useAnimationStore.getState().createAnimation('Test Animation', 10);

      // Add position track
      const positionTrack = {
        id: 'track_pos',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      useAnimationStore.getState().addTrack(animation.id, positionTrack);

      // Add keyframes
      useAnimationStore.getState().addKeyframe(animation.id, positionTrack.id, {
        id: 'kf_1',
        time: 0,
        value: [0, 0, 0],
        interpolation: 'linear',
      });

      useAnimationStore.getState().addKeyframe(animation.id, positionTrack.id, {
        id: 'kf_2',
        time: 5,
        value: [10, 0, 0],
        interpolation: 'linear',
      });

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.tracks).toHaveLength(1);
      expect(result?.tracks[0].keyframes).toHaveLength(2);
    });

    it('should support multiple tracks', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      useAnimationStore.getState().addTrack(animation.id, {
        id: 'track_pos',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      });

      useAnimationStore.getState().addTrack(animation.id, {
        id: 'track_rot',
        objectId: 'obj_1',
        property: 'rotation',
        propertyPath: ['rotation'],
        keyframes: [],
        enabled: true,
      });

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.tracks).toHaveLength(2);
    });
  });
});
