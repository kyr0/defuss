export interface CreateTaskbarOptions {
  position?: "top" | "bottom" | "left" | "right";
  stateful?: boolean; // if stateful, and if it has an id, it uses windowManagerStore to save its state
  theme?: string; // e.g., 'windows-xp', 'macos', etc.
  size?: "small" | "medium" | "large";
}

export interface TaskbarState {
  position: "top" | "bottom" | "left" | "right";
  theme: string;
  size: "small" | "medium" | "large";
}

export const defaultTaskbarOptions: CreateTaskbarOptions = {
  position: "bottom",
  stateful: false,
  theme: "default",
  size: "medium",
};

export class TaskbarManager {
  position: "top" | "bottom" | "left" | "right";
  theme: string; // e.g., 'windows-xp', 'macos', etc.
  size: "small" | "medium" | "large";

  constructor(options: CreateTaskbarOptions = defaultTaskbarOptions) {
    this.position = options.position || "bottom";
    this.theme = options.theme || "default";
    this.size = options.size || "medium";
    if (options.stateful) {
      // Load state from windowManagerStore if available
    }
  }
}

// Ensure singleton of Taskbar module-wide
globalThis.__defussTaskbarManager =
  globalThis.__defussTaskbarManager || new TaskbarManager();

export const taskbarManager = globalThis.__defussTaskbarManager;
