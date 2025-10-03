/**
 * Animation Commands Unit Tests
 * Sprint 6: Animation System & Timeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../../../stores/animationStore';
import {
  CreateAnimationCommand,
  DeleteAnimationCommand,
  AddTrackCommand,
  RemoveTrackCommand,
  AddKeyframeCommand,
  RemoveKeyframeCommand,
  UpdateKeyframeCommand,
  UpdateAnimationCommand,
} from '../AnimationCommands';

describe('AnimationCommands', () => {
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

  describe('CreateAnimationCommand', () => {
    it('should create animation on execute', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      useAnimationStore.getState().deleteAnimation(animation.id); // Remove it first

      const command = new CreateAnimationCommand(animation);
      command.execute();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result).toBeDefined();
      expect(result?.name).toBe('Test');
    });

    it('should delete animation on undo', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const command = new CreateAnimationCommand(animation);

      command.undo();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result).toBeUndefined();
    });

    it('should have descriptive message', () => {
      const animation = useAnimationStore.getState().createAnimation('My Animation');
      const command = new CreateAnimationCommand(animation);

      expect(command.getDescription()).toContain('My Animation');
    });
  });

  describe('DeleteAnimationCommand', () => {
    it('should delete animation on execute', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const command = new DeleteAnimationCommand(animation);

      command.execute();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result).toBeUndefined();
    });

    it('should restore animation on undo', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const command = new DeleteAnimationCommand(animation);

      command.execute();
      command.undo();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result).toBeDefined();
    });
  });

  describe('AddTrackCommand', () => {
    it('should add track on execute', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      const command = new AddTrackCommand(animation.id, track);
      command.execute();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.tracks).toHaveLength(1);
    });

    it('should remove track on undo', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      const command = new AddTrackCommand(animation.id, track);
      command.execute();
      command.undo();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.tracks).toHaveLength(0);
    });
  });

  describe('RemoveTrackCommand', () => {
    it('should remove track on execute', () => {
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

      const command = new RemoveTrackCommand(animation.id, track);
      command.execute();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.tracks).toHaveLength(0);
    });

    it('should restore track on undo', () => {
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

      const command = new RemoveTrackCommand(animation.id, track);
      command.execute();
      command.undo();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.tracks).toHaveLength(1);
    });
  });

  describe('AddKeyframeCommand', () => {
    it('should add keyframe on execute', () => {
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

      const command = new AddKeyframeCommand(animation.id, track.id, keyframe);
      command.execute();

      const result = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(result?.keyframes).toHaveLength(1);
    });

    it('should remove keyframe on undo', () => {
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

      const command = new AddKeyframeCommand(animation.id, track.id, keyframe);
      command.execute();
      command.undo();

      const result = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(result?.keyframes).toHaveLength(0);
    });

    it('should have time in description', () => {
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
        time: 2.5,
        value: [5, 0, 0],
        interpolation: 'linear' as const,
      };

      const command = new AddKeyframeCommand(animation.id, track.id, keyframe);
      expect(command.getDescription()).toContain('2.50');
    });
  });

  describe('RemoveKeyframeCommand', () => {
    it('should remove keyframe on execute', () => {
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

      const command = new RemoveKeyframeCommand(animation.id, track.id, keyframe);
      command.execute();

      const result = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(result?.keyframes).toHaveLength(0);
    });

    it('should restore keyframe on undo', () => {
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

      const command = new RemoveKeyframeCommand(animation.id, track.id, keyframe);
      command.execute();
      command.undo();

      const result = useAnimationStore.getState().getTrack(animation.id, track.id);
      expect(result?.keyframes).toHaveLength(1);
    });
  });

  describe('UpdateKeyframeCommand', () => {
    it('should update keyframe on execute', () => {
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

      const command = new UpdateKeyframeCommand(
        animation.id,
        track.id,
        keyframe.id,
        { time: 1.0, value: [5, 0, 0] },
        { time: 2.0, value: [10, 0, 0] }
      );

      command.execute();

      const result = useAnimationStore.getState().getKeyframe(animation.id, track.id, keyframe.id);
      expect(result?.time).toBe(2.0);
      expect(result?.value).toEqual([10, 0, 0]);
    });

    it('should restore old values on undo', () => {
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

      const command = new UpdateKeyframeCommand(
        animation.id,
        track.id,
        keyframe.id,
        { time: 1.0, value: [5, 0, 0] },
        { time: 2.0, value: [10, 0, 0] }
      );

      command.execute();
      command.undo();

      const result = useAnimationStore.getState().getKeyframe(animation.id, track.id, keyframe.id);
      expect(result?.time).toBe(1.0);
      expect(result?.value).toEqual([5, 0, 0]);
    });
  });

  describe('UpdateAnimationCommand', () => {
    it('should update animation on execute', () => {
      const animation = useAnimationStore.getState().createAnimation('Test', 5);

      const command = new UpdateAnimationCommand(
        animation.id,
        { name: 'Test', duration: 5 },
        { name: 'Updated', duration: 10, loop: true }
      );

      command.execute();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.name).toBe('Updated');
      expect(result?.duration).toBe(10);
      expect(result?.loop).toBe(true);
    });

    it('should restore old values on undo', () => {
      const animation = useAnimationStore.getState().createAnimation('Test', 5);

      const command = new UpdateAnimationCommand(
        animation.id,
        { name: 'Test', duration: 5 },
        { name: 'Updated', duration: 10 }
      );

      command.execute();
      command.undo();

      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.name).toBe('Test');
      expect(result?.duration).toBe(5);
    });
  });

  describe('Command Integration', () => {
    it('should support multiple execute/undo cycles', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');
      const command = new DeleteAnimationCommand(animation);

      command.execute();
      expect(useAnimationStore.getState().getAnimation(animation.id)).toBeUndefined();

      command.undo();
      expect(useAnimationStore.getState().getAnimation(animation.id)).toBeDefined();

      command.execute();
      expect(useAnimationStore.getState().getAnimation(animation.id)).toBeUndefined();
    });

    it('should work with command history stack', () => {
      const animation = useAnimationStore.getState().createAnimation('Test');

      const track = {
        id: 'track_1',
        objectId: 'obj_1',
        property: 'position',
        propertyPath: ['position'],
        keyframes: [],
        enabled: true,
      };

      const addTrackCmd = new AddTrackCommand(animation.id, track);
      addTrackCmd.execute();

      const keyframe = {
        id: 'kf_1',
        time: 1.0,
        value: [5, 0, 0],
        interpolation: 'linear' as const,
      };

      const addKeyframeCmd = new AddKeyframeCommand(animation.id, track.id, keyframe);
      addKeyframeCmd.execute();

      // Verify both operations worked
      const result = useAnimationStore.getState().getAnimation(animation.id);
      expect(result?.tracks).toHaveLength(1);
      expect(result?.tracks[0].keyframes).toHaveLength(1);

      // Undo in reverse order
      addKeyframeCmd.undo();
      const afterKeyframeUndo = useAnimationStore.getState().getAnimation(animation.id);
      expect(afterKeyframeUndo?.tracks[0].keyframes).toHaveLength(0);

      addTrackCmd.undo();
      const final = useAnimationStore.getState().getAnimation(animation.id);
      expect(final?.tracks).toHaveLength(0);
    });
  });
});
