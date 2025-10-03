/**
 * Animation Commands
 *
 * Command pattern implementations for animation operations (undo/redo support).
 * Sprint 6: Animation System & Timeline
 */

import { Command } from './Command';
import { useAnimationStore, Animation, AnimationTrack, Keyframe } from '../../stores/animationStore';

/**
 * Create Animation Command
 */
export class CreateAnimationCommand extends Command {
  private animation: Animation;

  constructor(animation: Animation) {
    super();
    this.animation = animation;
  }

  execute(): void {
    const store = useAnimationStore.getState();
    store.animations.set(this.animation.id, this.animation);
    store.setActiveAnimation(this.animation.id);
  }

  undo(): void {
    const store = useAnimationStore.getState();
    store.deleteAnimation(this.animation.id);
  }

  getDescription(): string {
    return `Create animation "${this.animation.name}"`;
  }
}

/**
 * Delete Animation Command
 */
export class DeleteAnimationCommand extends Command {
  private animation: Animation;

  constructor(animation: Animation) {
    super();
    this.animation = animation;
  }

  execute(): void {
    useAnimationStore.getState().deleteAnimation(this.animation.id);
  }

  undo(): void {
    const store = useAnimationStore.getState();
    store.animations.set(this.animation.id, this.animation);
  }

  getDescription(): string {
    return `Delete animation "${this.animation.name}"`;
  }
}

/**
 * Add Track Command
 */
export class AddTrackCommand extends Command {
  private animationId: string;
  private track: AnimationTrack;

  constructor(animationId: string, track: AnimationTrack) {
    super();
    this.animationId = animationId;
    this.track = track;
  }

  execute(): void {
    useAnimationStore.getState().addTrack(this.animationId, this.track);
  }

  undo(): void {
    useAnimationStore.getState().removeTrack(this.animationId, this.track.id);
  }

  getDescription(): string {
    return `Add track for ${this.track.property}`;
  }
}

/**
 * Remove Track Command
 */
export class RemoveTrackCommand extends Command {
  private animationId: string;
  private track: AnimationTrack;

  constructor(animationId: string, track: AnimationTrack) {
    super();
    this.animationId = animationId;
    this.track = track;
  }

  execute(): void {
    useAnimationStore.getState().removeTrack(this.animationId, this.track.id);
  }

  undo(): void {
    useAnimationStore.getState().addTrack(this.animationId, this.track);
  }

  getDescription(): string {
    return `Remove track for ${this.track.property}`;
  }
}

/**
 * Add Keyframe Command
 */
export class AddKeyframeCommand extends Command {
  private animationId: string;
  private trackId: string;
  private keyframe: Keyframe;

  constructor(animationId: string, trackId: string, keyframe: Keyframe) {
    super();
    this.animationId = animationId;
    this.trackId = trackId;
    this.keyframe = keyframe;
  }

  execute(): void {
    useAnimationStore.getState().addKeyframe(this.animationId, this.trackId, this.keyframe);
  }

  undo(): void {
    useAnimationStore.getState().removeKeyframe(this.animationId, this.trackId, this.keyframe.id);
  }

  getDescription(): string {
    return `Add keyframe at ${this.keyframe.time.toFixed(2)}s`;
  }
}

/**
 * Remove Keyframe Command
 */
export class RemoveKeyframeCommand extends Command {
  private animationId: string;
  private trackId: string;
  private keyframe: Keyframe;

  constructor(animationId: string, trackId: string, keyframe: Keyframe) {
    super();
    this.animationId = animationId;
    this.trackId = trackId;
    this.keyframe = keyframe;
  }

  execute(): void {
    useAnimationStore.getState().removeKeyframe(this.animationId, this.trackId, this.keyframe.id);
  }

  undo(): void {
    useAnimationStore.getState().addKeyframe(this.animationId, this.trackId, this.keyframe);
  }

  getDescription(): string {
    return `Remove keyframe at ${this.keyframe.time.toFixed(2)}s`;
  }
}

/**
 * Update Keyframe Command
 */
export class UpdateKeyframeCommand extends Command {
  private animationId: string;
  private trackId: string;
  private keyframeId: string;
  private oldValues: Partial<Keyframe>;
  private newValues: Partial<Keyframe>;

  constructor(
    animationId: string,
    trackId: string,
    keyframeId: string,
    oldValues: Partial<Keyframe>,
    newValues: Partial<Keyframe>
  ) {
    super();
    this.animationId = animationId;
    this.trackId = trackId;
    this.keyframeId = keyframeId;
    this.oldValues = oldValues;
    this.newValues = newValues;
  }

  execute(): void {
    useAnimationStore.getState().updateKeyframe(
      this.animationId,
      this.trackId,
      this.keyframeId,
      this.newValues
    );
  }

  undo(): void {
    useAnimationStore.getState().updateKeyframe(
      this.animationId,
      this.trackId,
      this.keyframeId,
      this.oldValues
    );
  }

  getDescription(): string {
    return `Update keyframe`;
  }
}

/**
 * Update Animation Command
 */
export class UpdateAnimationCommand extends Command {
  private animationId: string;
  private oldValues: Partial<Animation>;
  private newValues: Partial<Animation>;

  constructor(
    animationId: string,
    oldValues: Partial<Animation>,
    newValues: Partial<Animation>
  ) {
    super();
    this.animationId = animationId;
    this.oldValues = oldValues;
    this.newValues = newValues;
  }

  execute(): void {
    useAnimationStore.getState().updateAnimation(this.animationId, this.newValues);
  }

  undo(): void {
    useAnimationStore.getState().updateAnimation(this.animationId, this.oldValues);
  }

  getDescription(): string {
    return `Update animation settings`;
  }
}
