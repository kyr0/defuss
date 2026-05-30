import type { DefussApp, AppBundle } from "./app.js";
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

  async registerAppBundle(bundle: AppBundle): Promise<DefussApp> {
    const { DefussApp } = await import("./app.js");
    return DefussApp.fromBundle(bundle);
  }

  /** Find a registered app by executable name (e.g. "notepad.exe") */
  findApp(executable: string): DefussApp | undefined {
    return this.apps.find((app) => app.bundle?.executable === executable);
  }

  /** Run an app by executable name */
  runApp(executable: string): void {
    const app = this.findApp(executable);
    if (!app) {
      console.error(`App not found: ${executable}`);
      return;
    }
    app.run();
  }

  /** Launch a bundled app by creating a window and passing the container */
  launchApp(app: DefussApp): void {
    if (!app.bundle) return;
    // Emit a custom event that the Shell/Desktop component listens for
    const event = new CustomEvent("defuss:launch-app", { detail: { app } });
    document.dispatchEvent(event);
  }
}

// Ensure singleton of DesktopShell module-wide
globalThis.__defussDesktopShellManager =
  globalThis.__defussDesktopShellManager || new DesktopShellManager();

export const desktopShell = globalThis.__defussDesktopShellManager;
