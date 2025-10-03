/**
 * Command Pattern Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Command, CommandHistory } from '../Command';

// Mock command for testing
class MockCommand extends Command {
  public executed = false;
  public undone = false;

  constructor(private description: string) {
    super();
  }

  execute(): void {
    this.executed = true;
    this.undone = false;
  }

  undo(): void {
    this.undone = true;
    this.executed = false;
  }

  getDescription(): string {
    return this.description;
  }
}

describe('Command Pattern', () => {
  let history: CommandHistory;

  beforeEach(() => {
    history = new CommandHistory();
  });

  describe('CommandHistory', () => {
    it('should execute a command', () => {
      const command = new MockCommand('Test command');

      history.execute(command);

      expect(command.executed).toBe(true);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should undo a command', () => {
      const command = new MockCommand('Test command');

      history.execute(command);
      history.undo();

      expect(command.undone).toBe(true);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('should redo a command', () => {
      const command = new MockCommand('Test command');

      history.execute(command);
      history.undo();
      history.redo();

      expect(command.executed).toBe(true);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should handle multiple commands', () => {
      const cmd1 = new MockCommand('Command 1');
      const cmd2 = new MockCommand('Command 2');
      const cmd3 = new MockCommand('Command 3');

      history.execute(cmd1);
      history.execute(cmd2);
      history.execute(cmd3);

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);

      history.undo();
      expect(cmd3.undone).toBe(true);

      history.undo();
      expect(cmd2.undone).toBe(true);

      history.undo();
      expect(cmd1.undone).toBe(true);

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('should clear redo history when executing new command after undo', () => {
      const cmd1 = new MockCommand('Command 1');
      const cmd2 = new MockCommand('Command 2');
      const cmd3 = new MockCommand('Command 3');

      history.execute(cmd1);
      history.execute(cmd2);
      history.undo();

      // Execute new command after undo
      history.execute(cmd3);

      // Should not be able to redo cmd2
      history.redo();
      expect(cmd2.executed).toBe(false);
    });

    it('should return false when trying to undo with empty history', () => {
      const result = history.undo();
      expect(result).toBe(false);
    });

    it('should return false when trying to redo with no commands to redo', () => {
      const command = new MockCommand('Test command');
      history.execute(command);

      const result = history.redo();
      expect(result).toBe(false);
    });

    it('should get command descriptions', () => {
      const cmd1 = new MockCommand('Create object');
      const cmd2 = new MockCommand('Move object');

      history.execute(cmd1);
      history.execute(cmd2);

      expect(history.getCurrentDescription()).toBe('Move object');
      expect(history.getUndoDescription()).toBe('Move object');

      history.undo();
      expect(history.getRedoDescription()).toBe('Move object');
      expect(history.getUndoDescription()).toBe('Create object');
    });

    it('should clear history', () => {
      const cmd1 = new MockCommand('Command 1');
      const cmd2 = new MockCommand('Command 2');

      history.execute(cmd1);
      history.execute(cmd2);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.getCurrentDescription()).toBeNull();
    });

    it('should get full history', () => {
      const cmd1 = new MockCommand('Command 1');
      const cmd2 = new MockCommand('Command 2');
      const cmd3 = new MockCommand('Command 3');

      history.execute(cmd1);
      history.execute(cmd2);
      history.execute(cmd3);

      const fullHistory = history.getHistory();

      expect(fullHistory).toHaveLength(3);
      expect(fullHistory[0].command).toBe(cmd1);
      expect(fullHistory[1].command).toBe(cmd2);
      expect(fullHistory[2].command).toBe(cmd3);
      expect(fullHistory[2].isCurrent).toBe(true);
    });

    it('should maintain max history size', () => {
      // Create more than 100 commands
      for (let i = 0; i < 110; i++) {
        history.execute(new MockCommand(`Command ${i}`));
      }

      const fullHistory = history.getHistory();
      expect(fullHistory.length).toBeLessThanOrEqual(100);
    });
  });
});
