/**
 * Boolean Operations Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useBooleanOperationsStore } from '../booleanOperationsStore';

describe('booleanOperationsStore', () => {
  beforeEach(() => {
    // Reset store directly using setState to avoid re-entrancy issues
    useBooleanOperationsStore.setState({
      activeOperation: null,
      keepOriginals: false
    });
  });

  describe('setActiveOperation()', () => {
    it('should set active operation to union', () => {
      useBooleanOperationsStore.getState().setActiveOperation('union');

      expect(useBooleanOperationsStore.getState().activeOperation).toBe('union');
    });

    it('should set active operation to subtract', () => {
      useBooleanOperationsStore.getState().setActiveOperation('subtract');

      expect(useBooleanOperationsStore.getState().activeOperation).toBe('subtract');
    });

    it('should set active operation to intersect', () => {
      useBooleanOperationsStore.getState().setActiveOperation('intersect');

      expect(useBooleanOperationsStore.getState().activeOperation).toBe('intersect');
    });

    it('should set active operation to null', () => {
      useBooleanOperationsStore.getState().setActiveOperation('union');
      useBooleanOperationsStore.getState().setActiveOperation(null);

      expect(useBooleanOperationsStore.getState().activeOperation).toBeNull();
    });
  });

  describe('setKeepOriginals()', () => {
    it('should set keepOriginals to true', () => {
      useBooleanOperationsStore.getState().setKeepOriginals(true);

      expect(useBooleanOperationsStore.getState().keepOriginals).toBe(true);
    });

    it('should set keepOriginals to false', () => {
      useBooleanOperationsStore.getState().setKeepOriginals(false);

      expect(useBooleanOperationsStore.getState().keepOriginals).toBe(false);
    });

    it('should default to false', () => {
      expect(useBooleanOperationsStore.getState().keepOriginals).toBe(false);
    });
  });

  describe('reset()', () => {
    it('should reset all state', () => {
      useBooleanOperationsStore.getState().setActiveOperation('union');
      useBooleanOperationsStore.getState().setKeepOriginals(true);

      useBooleanOperationsStore.getState().reset();

      expect(useBooleanOperationsStore.getState().activeOperation).toBeNull();
      expect(useBooleanOperationsStore.getState().keepOriginals).toBe(false);
    });

    it('should be idempotent', () => {
      useBooleanOperationsStore.getState().reset();
      useBooleanOperationsStore.getState().reset();

      expect(useBooleanOperationsStore.getState().activeOperation).toBeNull();
      expect(useBooleanOperationsStore.getState().keepOriginals).toBe(false);
    });
  });
});
