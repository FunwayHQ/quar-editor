/**
 * Toast Component Tests
 *
 * Tests for toast notification UI components.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastContainer } from '../Toast';
import { useToastStore } from '../../stores/toastStore';

describe('ToastContainer', () => {
  beforeEach(() => {
    // Reset store before each test
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    test('renders nothing when there are no toasts', () => {
      const { container } = render(<ToastContainer />);

      const toasts = container.querySelectorAll('[class*="flex items-center"]');
      expect(toasts.length).toBe(0);
    });

    test('renders a success toast', () => {
      const store = useToastStore.getState();
      store.success('Success message');

      render(<ToastContainer />);

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    test('renders an error toast', () => {
      const store = useToastStore.getState();
      store.error('Error message');

      render(<ToastContainer />);

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    test('renders a warning toast', () => {
      const store = useToastStore.getState();
      store.warning('Warning message');

      render(<ToastContainer />);

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    test('renders an info toast', () => {
      const store = useToastStore.getState();
      store.info('Info message');

      render(<ToastContainer />);

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    test('renders multiple toasts', () => {
      const store = useToastStore.getState();
      store.success('Success message');
      store.error('Error message');
      store.warning('Warning message');

      render(<ToastContainer />);

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  describe('toast types and styling', () => {
    test('success toast has green styling', () => {
      const store = useToastStore.getState();
      store.success('Success message');

      const { container } = render(<ToastContainer />);
      const toast = screen.getByText('Success message').closest('div');

      expect(toast?.className).toContain('bg-green-500/20');
      expect(toast?.className).toContain('border-green-500/50');
    });

    test('error toast has red styling', () => {
      const store = useToastStore.getState();
      store.error('Error message');

      const { container } = render(<ToastContainer />);
      const toast = screen.getByText('Error message').closest('div');

      expect(toast?.className).toContain('bg-red-500/20');
      expect(toast?.className).toContain('border-red-500/50');
    });

    test('warning toast has yellow styling', () => {
      const store = useToastStore.getState();
      store.warning('Warning message');

      const { container } = render(<ToastContainer />);
      const toast = screen.getByText('Warning message').closest('div');

      expect(toast?.className).toContain('bg-yellow-500/20');
      expect(toast?.className).toContain('border-yellow-500/50');
    });

    test('info toast has blue styling', () => {
      const store = useToastStore.getState();
      store.info('Info message');

      const { container } = render(<ToastContainer />);
      const toast = screen.getByText('Info message').closest('div');

      expect(toast?.className).toContain('bg-blue-500/20');
      expect(toast?.className).toContain('border-blue-500/50');
    });
  });

  describe('close button', () => {
    test('renders close button for each toast', () => {
      const store = useToastStore.getState();
      store.success('Test message');

      const { container } = render(<ToastContainer />);

      const closeButtons = container.querySelectorAll('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    test('clicking close button removes the toast', async () => {
      const store = useToastStore.getState();
      store.success('Test message');

      const { container, rerender } = render(<ToastContainer />);

      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Find and click close button
      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton!);

      // Run timers for the close animation (300ms)
      await vi.advanceTimersByTimeAsync(300);

      // Rerender to reflect state change
      rerender(<ToastContainer />);

      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    test('can close individual toasts independently', async () => {
      const store = useToastStore.getState();
      store.success('Toast 1');
      store.error('Toast 2');

      const { container, rerender } = render(<ToastContainer />);

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();

      // Find first close button
      const closeButtons = container.querySelectorAll('button');
      fireEvent.click(closeButtons[0]);

      // Run timers for the close animation (300ms)
      await vi.advanceTimersByTimeAsync(300);
      rerender(<ToastContainer />);

      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
    });
  });

  describe('auto-dismiss', () => {
    test('toast auto-dismisses after duration', async () => {
      const store = useToastStore.getState();
      store.addToast({ type: 'success', message: 'Test message', duration: 1000 });

      const { rerender } = render(<ToastContainer />);

      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Fast-forward past duration
      await vi.advanceTimersByTimeAsync(1000);
      rerender(<ToastContainer />);

      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    test('multiple toasts auto-dismiss at different times', async () => {
      const store = useToastStore.getState();
      store.addToast({ type: 'success', message: 'Toast 1', duration: 1000 });
      store.addToast({ type: 'error', message: 'Toast 2', duration: 2000 });

      const { rerender } = render(<ToastContainer />);

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();

      // Fast-forward 1 second
      await vi.advanceTimersByTimeAsync(1000);
      rerender(<ToastContainer />);

      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();

      // Fast-forward another second
      await vi.advanceTimersByTimeAsync(1000);
      rerender(<ToastContainer />);

      expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
    });
  });

  describe('animations', () => {
    test('toast has slide-in animation class', () => {
      const store = useToastStore.getState();
      store.success('Test message');

      const { container } = render(<ToastContainer />);
      const toast = screen.getByText('Test message').closest('div');

      expect(toast?.className).toContain('animate-slide-in');
    });

    test('toast has leaving animation when closed', () => {
      const store = useToastStore.getState();
      store.success('Test message');

      const { container } = render(<ToastContainer />);

      const closeButton = container.querySelector('button');
      fireEvent.click(closeButton!);

      const toast = screen.getByText('Test message').closest('div');
      expect(toast?.className).toContain('opacity-0');
      expect(toast?.className).toContain('translate-x-full');
    });
  });

  describe('accessibility', () => {
    test('close button is keyboard accessible', () => {
      const store = useToastStore.getState();
      store.success('Test message');

      const { container } = render(<ToastContainer />);
      const closeButton = container.querySelector('button');

      expect(closeButton).toBeInTheDocument();
      expect(closeButton?.tagName).toBe('BUTTON');
    });

    test('message text is readable', () => {
      const store = useToastStore.getState();
      store.success('Test message');

      render(<ToastContainer />);

      const message = screen.getByText('Test message');
      expect(message).toBeInTheDocument();
      expect(message.tagName).toBe('P');
    });
  });

  describe('edge cases', () => {
    test('handles very long messages', () => {
      const store = useToastStore.getState();
      const longMessage = 'A'.repeat(500);

      store.success(longMessage);

      render(<ToastContainer />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    test('handles HTML in message (should render as text)', () => {
      const store = useToastStore.getState();
      const htmlMessage = '<script>alert("XSS")</script>';

      store.success(htmlMessage);

      render(<ToastContainer />);

      expect(screen.getByText(htmlMessage)).toBeInTheDocument();
      // Ensure it's rendered as text, not executed
      expect(document.querySelectorAll('script').length).toBe(0);
    });

    test('handles empty message', () => {
      const store = useToastStore.getState();
      store.success('');

      const { container } = render(<ToastContainer />);

      const toasts = container.querySelectorAll('[class*="flex items-center"]');
      expect(toasts.length).toBe(1);
    });

    test('handles rapid toast creation', () => {
      const store = useToastStore.getState();

      // Add 10 toasts rapidly
      for (let i = 0; i < 10; i++) {
        store.success(`Toast ${i}`);
      }

      const { container } = render(<ToastContainer />);

      const toasts = container.querySelectorAll('[class*="flex items-center"]');
      expect(toasts.length).toBe(10);
    });
  });

  describe('position and layout', () => {
    test('container is positioned at top-right', () => {
      const { container } = render(<ToastContainer />);
      const toastContainer = container.firstChild as HTMLElement;

      expect(toastContainer.className).toContain('fixed');
      expect(toastContainer.className).toContain('top-4');
      expect(toastContainer.className).toContain('right-4');
    });

    test('container has high z-index', () => {
      const { container } = render(<ToastContainer />);
      const toastContainer = container.firstChild as HTMLElement;

      expect(toastContainer.className).toContain('z-[9999]');
    });

    test('toasts are stacked vertically', () => {
      const { container } = render(<ToastContainer />);
      const toastContainer = container.firstChild as HTMLElement;

      expect(toastContainer.className).toContain('flex-col');
      expect(toastContainer.className).toContain('gap-2');
    });
  });
});
