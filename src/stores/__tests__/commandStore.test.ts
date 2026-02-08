/**
 * Command Store Tests
 *
 * Tests the command store version counter and undo/redo functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from '../commandStore';
import { Command } from '../../lib/commands/Command';

class TestCommand extends Command {
  executed = false;
  undone = false;
  redone = false;

  get description(): string { return 'Test command'; }

  execute(): void { this.executed = true; }
  undo(): void { this.undone = true; }
  redo(): void { this.redone = true; }
}

describe('commandStore', () => {
  beforeEach(() => {
    useCommandStore.getState().clearHistory();
  });

  it('should start with version 0', () => {
    expect(useCommandStore.getState().version).toBe(0);
  });

  it('should increment version on executeCommand', () => {
    const cmd = new TestCommand();
    useCommandStore.getState().executeCommand(cmd);
    expect(useCommandStore.getState().version).toBe(1);
  });

  it('should increment version on undo', () => {
    const cmd = new TestCommand();
    useCommandStore.getState().executeCommand(cmd);
    const vBefore = useCommandStore.getState().version;
    useCommandStore.getState().undo();
    expect(useCommandStore.getState().version).toBe(vBefore + 1);
  });

  it('should increment version on redo', () => {
    const cmd = new TestCommand();
    useCommandStore.getState().executeCommand(cmd);
    useCommandStore.getState().undo();
    const vBefore = useCommandStore.getState().version;
    useCommandStore.getState().redo();
    expect(useCommandStore.getState().version).toBe(vBefore + 1);
  });

  it('should reset version on clearHistory', () => {
    const cmd = new TestCommand();
    useCommandStore.getState().executeCommand(cmd);
    useCommandStore.getState().executeCommand(cmd);
    expect(useCommandStore.getState().version).toBeGreaterThan(0);

    useCommandStore.getState().clearHistory();
    expect(useCommandStore.getState().version).toBe(0);
  });

  it('should execute the command', () => {
    const cmd = new TestCommand();
    useCommandStore.getState().executeCommand(cmd);
    expect(cmd.executed).toBe(true);
  });

  it('should undo the command', () => {
    const cmd = new TestCommand();
    useCommandStore.getState().executeCommand(cmd);
    useCommandStore.getState().undo();
    expect(cmd.undone).toBe(true);
  });

  it('should report canUndo/canRedo correctly', () => {
    expect(useCommandStore.getState().canUndo()).toBe(false);
    expect(useCommandStore.getState().canRedo()).toBe(false);

    const cmd = new TestCommand();
    useCommandStore.getState().executeCommand(cmd);
    expect(useCommandStore.getState().canUndo()).toBe(true);
    expect(useCommandStore.getState().canRedo()).toBe(false);

    useCommandStore.getState().undo();
    expect(useCommandStore.getState().canUndo()).toBe(false);
    expect(useCommandStore.getState().canRedo()).toBe(true);
  });
});
