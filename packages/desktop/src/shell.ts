import type { DefussApp } from "./app.js";
import type { TaskbarState } from "./taskbar.js";
import type { WindowState } from "./window.js";

export type DesktopShellTheme = "xp" | "98";

export interface DesktopShellState {
  taskbar: TaskbarState;
  windows: Record<string, WindowState>;
}

export class DesktopShellManager {
  constructor(public apps: DefussApp[] = []) {}

  addApp(app: DefussApp) {
    this.apps.push(app);
    console.log(`App added: ${app.config.name}`);
  }
}

// Ensure singleton of DesktopShell module-wide
globalThis.__defussDesktopShellManager =
  globalThis.__defussDesktopShellManager || new DesktopShellManager();

export const desktopShell = globalThis.__defussDesktopShellManager;
