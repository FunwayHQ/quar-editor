/**
 * Hierarchical Animation Tests
 *
 * Tests for animation system with object hierarchies (Sprint 9)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../animationStore';
import { useObjectsStore } from '../objectsStore';
import { getAnimationEngine } from '../../lib/animation/AnimationEngine';

describe('Hierarchical Animations', () => {
  beforeEach(() => {
    // Reset stores
    useAnimationStore.setState({
      animations: new Map(),
      activeAnimationId: null,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      playbackSpeed: 1,
      frameRate: 30,
      autoKeyframe: false,
      snapToKeyframes: false,
      timelineZoom: 100,
      timelineScroll: 0,
    });

    useObjectsStore.setState({
      objects: new Map(),
      selectedIds: [],
    });
  });

  describe('Local space animations (default)', () => {
    it('should create keyframes with space=local by default', () => {
      const animStore = useAnimationStore.getState();
      const animation = animStore.createAnimation('Test Animation', 5);

      // Add a track
      animStore.addTrack(animation.id, {
        id: 'track1',
        objectId: 'obj1',
        property: 'position',
        propertyPath: ['position', 'x'],
        keyframes: [],
        enabled: true,
      });

      // Add a keyframe
      animStore.addKeyframe(animation.id, 'track1', {
        id: 'kf1',
        time: 0,
        value: 5,
        interpolation: 'linear',
      });

      // Refetch
      const updatedAnimation = useAnimationStore.getState().animations.get(animation.id);
      const track = updatedAnimation?.tracks.find(t => t.id === 'track1');
      const keyframe = track?.keyframes[0];

      expect(keyframe?.space).toBe('local');
    });

    it('should animate child in local space relative to parent', () => {
      const objectsStore = useObjectsStore.getState();

      // Create parent at (10, 0, 0)
      const parent = objectsStore.createPrimitive('box', [10, 0, 0]);

      // Create child at local (0, 0, 0) = world (10, 0, 0)
      const child = objectsStore.createPrimitive('sphere', [0, 0, 0]);
      objectsStore.setParent(child.id, parent.id);

      // Create animation for child
      const animStore = useAnimationStore.getState();
      const animation = animStore.createAnimation('Child Animation', 2);

      animStore.addTrack(animation.id, {
        id: 'track1',
        objectId: child.id,
        property: 'position',
        propertyPath: ['position', 'x'],
        keyframes: [],
        enabled: true,
      });

      // Keyframe: child.position.x goes from 0 → 5 (local space)
      animStore.addKeyframe(animation.id, 'track1', {
        id: 'kf1',
        time: 0,
        value: 0,
        interpolation: 'linear',
      });

      animStore.addKeyframe(animation.id, 'track1', {
        id: 'kf2',
        time: 2,
        value: 5,
        interpolation: 'linear',
      });

      // Refetch animation
      const updatedAnimation = useAnimationStore.getState().animations.get(animation.id)!;

      // Apply animation at t=1 (halfway)
      const engine = getAnimationEngine();
      engine.seekTo(updatedAnimation, 1);

      // Refetch object
      const updatedChild = useObjectsStore.getState().objects.get(child.id);

      // Local position should be at x=2.5 (halfway between 0 and 5)
      expect(updatedChild?.position[0]).toBeCloseTo(2.5);
    });

    it('should combine parent and child animations', () => {
      const objectsStore = useObjectsStore.getState();

      // Create parent
      const parent = objectsStore.createPrimitive('box', [0, 0, 0]);

      // Create child at local (5, 0, 0)
      const child = objectsStore.createPrimitive('sphere', [5, 0, 0]);
      objectsStore.setParent(child.id, parent.id);

      // Create animation
      const animStore = useAnimationStore.getState();
      const animation = animStore.createAnimation('Combined Animation', 2);

      // Parent track: parent.position.x goes from 0 → 10
      animStore.addTrack(animation.id, {
        id: 'parentTrack',
        objectId: parent.id,
        property: 'position',
        propertyPath: ['position', 'x'],
        keyframes: [],
        enabled: true,
      });

      animStore.addKeyframe(animation.id, 'parentTrack', {
        id: 'pkf1',
        time: 0,
        value: 0,
        interpolation: 'linear',
      });

      animStore.addKeyframe(animation.id, 'parentTrack', {
        id: 'pkf2',
        time: 2,
        value: 10,
        interpolation: 'linear',
      });

      // Child track: child.position.x goes from 5 → 8 (local space)
      animStore.addTrack(animation.id, {
        id: 'childTrack',
        objectId: child.id,
        property: 'position',
        propertyPath: ['position', 'x'],
        keyframes: [],
        enabled: true,
      });

      animStore.addKeyframe(animation.id, 'childTrack', {
        id: 'ckf1',
        time: 0,
        value: 5,
        interpolation: 'linear',
      });

      animStore.addKeyframe(animation.id, 'childTrack', {
        id: 'ckf2',
        time: 2,
        value: 8,
        interpolation: 'linear',
      });

      // Refetch animation
      const updatedAnimation = useAnimationStore.getState().animations.get(animation.id)!;

      // Apply at t=1 (halfway)
      const engine = getAnimationEngine();
      engine.seekTo(updatedAnimation, 1);

      // Refetch objects
      const updatedParent = useObjectsStore.getState().objects.get(parent.id);
      const updatedChild = useObjectsStore.getState().objects.get(child.id);

      // Parent local position: 0 → 10, at t=1 should be 5
      expect(updatedParent?.position[0]).toBeCloseTo(5);

      // Child local position: 5 → 8, at t=1 should be 6.5
      expect(updatedChild?.position[0]).toBeCloseTo(6.5);
    });

    it('should animate nested hierarchy (3 levels)', () => {
      const objectsStore = useObjectsStore.getState();

      // Create 3-level hierarchy
      const grandparent = objectsStore.createPrimitive('box', [0, 0, 0]);
      const parent = objectsStore.createPrimitive('sphere', [10, 0, 0]);
      const child = objectsStore.createPrimitive('cylinder', [5, 0, 0]);

      objectsStore.setParent(parent.id, grandparent.id);
      objectsStore.setParent(child.id, parent.id);

      // Animate grandparent
      const animStore = useAnimationStore.getState();
      const animation = animStore.createAnimation('Nested Animation', 1);

      animStore.addTrack(animation.id, {
        id: 'gpTrack',
        objectId: grandparent.id,
        property: 'position',
        propertyPath: ['position', 'x'],
        keyframes: [],
        enabled: true,
      });

      animStore.addKeyframe(animation.id, 'gpTrack', {
        id: 'kf1',
        time: 0,
        value: 0,
        interpolation: 'linear',
      });

      animStore.addKeyframe(animation.id, 'gpTrack', {
        id: 'kf2',
        time: 1,
        value: 20,
        interpolation: 'linear',
      });

      // Refetch animation
      const updatedAnimation = useAnimationStore.getState().animations.get(animation.id)!;

      // Apply at t=0.5
      const engine = getAnimationEngine();
      engine.seekTo(updatedAnimation, 0.5);

      // Refetch objects
      const updatedGP = useObjectsStore.getState().objects.get(grandparent.id);
      const updatedP = useObjectsStore.getState().objects.get(parent.id);
      const updatedC = useObjectsStore.getState().objects.get(child.id);

      // Grandparent moves to x=10
      expect(updatedGP?.position[0]).toBeCloseTo(10);

      // Parent and child should maintain their local positions
      expect(updatedP?.position[0]).toBeCloseTo(10);
      expect(updatedC?.position[0]).toBeCloseTo(5);
    });
  });

  describe('Rotation animations with hierarchy', () => {
    it('should rotate child around parent pivot', () => {
      const objectsStore = useObjectsStore.getState();

      // Create parent and child
      const parent = objectsStore.createPrimitive('box', [0, 0, 0]);
      const child = objectsStore.createPrimitive('sphere', [5, 0, 0]);
      objectsStore.setParent(child.id, parent.id);

      // Animate parent rotation
      const animStore = useAnimationStore.getState();
      const animation = animStore.createAnimation('Rotation Animation', 1);

      animStore.addTrack(animation.id, {
        id: 'rotTrack',
        objectId: parent.id,
        property: 'rotation',
        propertyPath: ['rotation', 'y'],
        keyframes: [],
        enabled: true,
      });

      animStore.addKeyframe(animation.id, 'rotTrack', {
        id: 'kf1',
        time: 0,
        value: 0,
        interpolation: 'linear',
      });

      animStore.addKeyframe(animation.id, 'rotTrack', {
        id: 'kf2',
        time: 1,
        value: Math.PI / 2, // 90 degrees
        interpolation: 'linear',
      });

      // Refetch animation
      const updatedAnimation = useAnimationStore.getState().animations.get(animation.id)!;

      // Apply at t=1
      const engine = getAnimationEngine();
      engine.seekTo(updatedAnimation, 1);

      // Refetch
      const updatedParent = useObjectsStore.getState().objects.get(parent.id);

      // Parent rotation should be 90 degrees
      expect(updatedParent?.rotation[1]).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('Scale animations with hierarchy', () => {
    it('should scale children with parent', () => {
      const objectsStore = useObjectsStore.getState();

      // Create parent and child
      const parent = objectsStore.createPrimitive('box', [0, 0, 0]);
      const child = objectsStore.createPrimitive('sphere', [5, 0, 0]);
      objectsStore.setParent(child.id, parent.id);

      // Animate parent scale
      const animStore = useAnimationStore.getState();
      const animation = animStore.createAnimation('Scale Animation', 1);

      animStore.addTrack(animation.id, {
        id: 'scaleTrack',
        objectId: parent.id,
        property: 'scale',
        propertyPath: ['scale', 'x'],
        keyframes: [],
        enabled: true,
      });

      animStore.addKeyframe(animation.id, 'scaleTrack', {
        id: 'kf1',
        time: 0,
        value: 1,
        interpolation: 'linear',
      });

      animStore.addKeyframe(animation.id, 'scaleTrack', {
        id: 'kf2',
        time: 1,
        value: 2,
        interpolation: 'linear',
      });

      // Refetch animation
      const updatedAnimation = useAnimationStore.getState().animations.get(animation.id)!;

      // Apply at t=1
      const engine = getAnimationEngine();
      engine.seekTo(updatedAnimation, 1);

      // Refetch
      const updatedParent = useObjectsStore.getState().objects.get(parent.id);

      // Parent scale should be 2
      expect(updatedParent?.scale[0]).toBeCloseTo(2);
    });
  });

  describe('Animation with grouped objects', () => {
    it('should animate group and all children follow', () => {
      const objectsStore = useObjectsStore.getState();

      // Create 2 objects and group them
      const obj1 = objectsStore.createPrimitive('box', [0, 0, 0]);
      const obj2 = objectsStore.createPrimitive('sphere', [5, 0, 0]);

      const groupId = objectsStore.createGroup([obj1.id, obj2.id]);

      // Animate the group
      const animStore = useAnimationStore.getState();
      const animation = animStore.createAnimation('Group Animation', 1);

      animStore.addTrack(animation.id, {
        id: 'groupTrack',
        objectId: groupId,
        property: 'position',
        propertyPath: ['position', 'y'],
        keyframes: [],
        enabled: true,
      });

      animStore.addKeyframe(animation.id, 'groupTrack', {
        id: 'kf1',
        time: 0,
        value: 0,
        interpolation: 'linear',
      });

      animStore.addKeyframe(animation.id, 'groupTrack', {
        id: 'kf2',
        time: 1,
        value: 10,
        interpolation: 'linear',
      });

      // Refetch animation
      const updatedAnimation = useAnimationStore.getState().animations.get(animation.id)!;

      // Apply at t=1
      const engine = getAnimationEngine();
      engine.seekTo(updatedAnimation, 1);

      // Refetch
      const updatedGroup = useObjectsStore.getState().objects.get(groupId);

      // Group moves to y=10
      expect(updatedGroup?.position[1]).toBeCloseTo(10);

      // Children maintain their local positions
      const updatedObj1 = useObjectsStore.getState().objects.get(obj1.id);
      const updatedObj2 = useObjectsStore.getState().objects.get(obj2.id);

      expect(updatedObj1?.position[1]).toBeCloseTo(0);
      expect(updatedObj2?.position[1]).toBeCloseTo(0);
    });
  });
});
