import type { Window } from "./window.js";
import { desktopShell } from "./shell.js";

export interface DefussAppConfig {
  name: string;
  icon: string;
  main: (app: DefussApp, ...args: any[]) => void;
  argv?: any[];
}

// DefussApp represents a desktop application in the Defuss environment.
// It holds configuration, manages windows, and provides a run method to start the app.
// It is registered with the DefussShell for management and lifecycle handling.
// The app can have multiple windows, and each window can be interacted with independently.
export class DefussApp {
  constructor(
    public config: DefussAppConfig,
    public windows: Window[] = [],
  ) {
    desktopShell.addApp(this);
  }

  addWindow(window: Window) {
    this.windows.push(window);
    console.log(`Window added to app: ${this.config.name}`);
  }

  run() {
    console.log(`Running app: ${this.config.name}`);
    this.config.main(this, ...(this.config.argv || []));
  }
}
