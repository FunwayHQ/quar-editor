/**
 * Command Pattern Base Classes
 *
 * Implements the Command pattern for undo/redo functionality.
 */

export abstract class Command {
  abstract execute(): void;
  abstract undo(): void;
  abstract getDescription(): string;
}

export class CommandHistory {
  private history: Command[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 100;

  execute(command: Command): void {
    // Remove any commands after current index (when executing a new command after undo)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Execute the command
    command.execute();

    // Add to history
    this.history.push(command);
    this.currentIndex++;

    // Maintain max history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const command = this.history[this.currentIndex];
    command.undo();
    this.currentIndex--;

    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    command.execute();

    return true;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getHistory(): { command: Command; index: number; isCurrent: boolean }[] {
    return this.history.map((command, index) => ({
      command,
      index,
      isCurrent: index === this.currentIndex,
    }));
  }

  getCurrentDescription(): string | null {
    if (this.currentIndex < 0) return null;
    return this.history[this.currentIndex].getDescription();
  }

  getUndoDescription(): string | null {
    if (!this.canUndo()) return null;
    return this.history[this.currentIndex].getDescription();
  }

  getRedoDescription(): string | null {
    if (!this.canRedo()) return null;
    return this.history[this.currentIndex + 1].getDescription();
  }
}
