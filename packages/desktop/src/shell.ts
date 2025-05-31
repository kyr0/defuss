import type { DefussApp } from "./app.js";
import type { TaskbarState } from "./taskbar.js";
import type { WindowState } from "./window.js";

export type DesktopShellTheme = "xp" | "98";

export interface DesktopShellState {
  taskbar: TaskbarState;
  windows: Record<string, WindowState>;
}

export class DesktopShell {
  constructor(public apps: DefussApp[] = []) {}

  addApp(app: DefussApp) {
    this.apps.push(app);
    console.log(`App added: ${app.config.name}`);
  }
}

// Ensure singleton of DesktopShell module-wide
globalThis.__defussDesktopShell =
  globalThis.__defussDesktopShell || new DesktopShell();

export const desktopShell = globalThis.__defussDesktopShell;
