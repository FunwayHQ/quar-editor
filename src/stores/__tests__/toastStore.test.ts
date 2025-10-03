/**
 * Toast Store Tests
 *
 * Tests for toast notification state management.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore } from '../toastStore';

describe('ToastStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addToast', () => {
    test('adds a toast to the store', () => {
      const store = useToastStore.getState();

      store.addToast({
        type: 'success',
        message: 'Test message',
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0].id).toBeDefined();
    });

    test('assigns a unique ID to each toast', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Toast 1' });
      store.addToast({ type: 'error', message: 'Toast 2' });

      const toasts = useToastStore.getState().toasts;
      expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    test('uses default duration of 3000ms', () => {
      const store = useToastStore.getState();

      store.addToast({
        type: 'success',
        message: 'Test message',
      });

      const toast = useToastStore.getState().toasts[0];
      expect(toast.duration).toBe(3000);
    });

    test('accepts custom duration', () => {
      const store = useToastStore.getState();

      store.addToast({
        type: 'success',
        message: 'Test message',
        duration: 5000,
      });

      const toast = useToastStore.getState().toasts[0];
      expect(toast.duration).toBe(5000);
    });

    test('auto-removes toast after duration', () => {
      const store = useToastStore.getState();

      store.addToast({
        type: 'success',
        message: 'Test message',
        duration: 1000,
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    test('does not auto-remove toast if duration is 0', () => {
      const store = useToastStore.getState();

      store.addToast({
        type: 'success',
        message: 'Test message',
        duration: 0,
      });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(5000);

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    test('handles multiple toasts', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Toast 1' });
      store.addToast({ type: 'error', message: 'Toast 2' });
      store.addToast({ type: 'warning', message: 'Toast 3' });

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(3);
    });
  });

  describe('removeToast', () => {
    test('removes a toast by ID', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Toast 1' });
      store.addToast({ type: 'error', message: 'Toast 2' });

      const toasts = useToastStore.getState().toasts;
      const firstToastId = toasts[0].id;

      store.removeToast(firstToastId);

      const remainingToasts = useToastStore.getState().toasts;
      expect(remainingToasts).toHaveLength(1);
      expect(remainingToasts[0].message).toBe('Toast 2');
    });

    test('does nothing if toast ID not found', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Toast 1' });

      expect(useToastStore.getState().toasts).toHaveLength(1);

      store.removeToast('non-existent-id');

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    test('removes all toasts', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Toast 1' });
      store.addToast({ type: 'error', message: 'Toast 2' });
      store.addToast({ type: 'warning', message: 'Toast 3' });

      expect(useToastStore.getState().toasts).toHaveLength(3);

      store.clearAll();

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    test('works when there are no toasts', () => {
      const store = useToastStore.getState();

      expect(useToastStore.getState().toasts).toHaveLength(0);

      store.clearAll();

      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('convenience methods', () => {
    describe('success', () => {
      test('adds a success toast', () => {
        const store = useToastStore.getState();

        store.success('Success message');

        const toast = useToastStore.getState().toasts[0];
        expect(toast.type).toBe('success');
        expect(toast.message).toBe('Success message');
      });

      test('accepts custom duration', () => {
        const store = useToastStore.getState();

        store.success('Success message', 5000);

        const toast = useToastStore.getState().toasts[0];
        expect(toast.duration).toBe(5000);
      });
    });

    describe('error', () => {
      test('adds an error toast', () => {
        const store = useToastStore.getState();

        store.error('Error message');

        const toast = useToastStore.getState().toasts[0];
        expect(toast.type).toBe('error');
        expect(toast.message).toBe('Error message');
      });

      test('accepts custom duration', () => {
        const store = useToastStore.getState();

        store.error('Error message', 5000);

        const toast = useToastStore.getState().toasts[0];
        expect(toast.duration).toBe(5000);
      });
    });

    describe('warning', () => {
      test('adds a warning toast', () => {
        const store = useToastStore.getState();

        store.warning('Warning message');

        const toast = useToastStore.getState().toasts[0];
        expect(toast.type).toBe('warning');
        expect(toast.message).toBe('Warning message');
      });

      test('accepts custom duration', () => {
        const store = useToastStore.getState();

        store.warning('Warning message', 5000);

        const toast = useToastStore.getState().toasts[0];
        expect(toast.duration).toBe(5000);
      });
    });

    describe('info', () => {
      test('adds an info toast', () => {
        const store = useToastStore.getState();

        store.info('Info message');

        const toast = useToastStore.getState().toasts[0];
        expect(toast.type).toBe('info');
        expect(toast.message).toBe('Info message');
      });

      test('accepts custom duration', () => {
        const store = useToastStore.getState();

        store.info('Info message', 5000);

        const toast = useToastStore.getState().toasts[0];
        expect(toast.duration).toBe(5000);
      });
    });
  });

  describe('toast lifecycle', () => {
    test('multiple toasts auto-remove independently', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Toast 1', duration: 1000 });
      store.addToast({ type: 'error', message: 'Toast 2', duration: 2000 });

      expect(useToastStore.getState().toasts).toHaveLength(2);

      // Fast-forward 1 second
      vi.advanceTimersByTime(1000);

      // First toast should be removed
      const toastsAfter1s = useToastStore.getState().toasts;
      expect(toastsAfter1s).toHaveLength(1);
      expect(toastsAfter1s[0].message).toBe('Toast 2');

      // Fast-forward another second
      vi.advanceTimersByTime(1000);

      // Second toast should be removed
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    test('manual removal works even before auto-removal', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Test message', duration: 5000 });

      const toast = useToastStore.getState().toasts[0];

      // Manually remove before timeout
      store.removeToast(toast.id);

      expect(useToastStore.getState().toasts).toHaveLength(0);

      // Fast-forward past the original timeout
      vi.advanceTimersByTime(5000);

      // Should still be empty (no errors)
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('handles empty message', () => {
      const store = useToastStore.getState();

      store.success('');

      const toast = useToastStore.getState().toasts[0];
      expect(toast.message).toBe('');
    });

    test('handles very long messages', () => {
      const store = useToastStore.getState();
      const longMessage = 'A'.repeat(1000);

      store.success(longMessage);

      const toast = useToastStore.getState().toasts[0];
      expect(toast.message).toBe(longMessage);
    });

    test('handles special characters in message', () => {
      const store = useToastStore.getState();
      const specialMessage = '<script>alert("XSS")</script>';

      store.success(specialMessage);

      const toast = useToastStore.getState().toasts[0];
      expect(toast.message).toBe(specialMessage);
    });

    test('handles negative duration', () => {
      const store = useToastStore.getState();

      store.addToast({ type: 'success', message: 'Test', duration: -1 });

      // Should not auto-remove with negative duration
      vi.advanceTimersByTime(5000);
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });
});
