import { desktopShell } from "./shell.js";

export interface DefussAppConfig {
  name: string;
  icon: string;
  main: (app: DefussApp, ...args: any[]) => void;
  argv?: any[];
}

export type AppMainFn = (params: {
  app: DefussApp;
  container: HTMLElement;
}) => void | Promise<void>;

export interface AppBundleModule {
  main: AppMainFn;
}

export interface AppBundle {
  executable: string; // e.g. "notepad.exe"
  displayName: string; // e.g. "Notepad"
  icon: string; // path to icon, e.g. "/desktop/notepad.png"
  width?: number;
  height?: number;
  // Optional entry id for dynamic imports, e.g. "virtual:notepad" or "/apps/notepad/main.js"
  entry?: string;
  // Optional lazy loader used by bundlers for code splitting.
  load?: () => Promise<AppBundleModule>;
  main?: AppMainFn;
}

// DefussApp represents a desktop application in the Defuss environment.
// It holds configuration, manages windows, and provides a run method to start the app.
// It is registered with the DefussShell for management and lifecycle handling.
// The app can have multiple windows, and each window can be interacted with independently.
export class DefussApp {
  bundle?: AppBundle;

  constructor(public config: DefussAppConfig) {
    desktopShell.addApp(this);
  }

  static fromBundle(bundle: AppBundle): DefussApp {
    const app = new DefussApp({
      name: bundle.displayName,
      icon: bundle.icon,
      main: () => {},
    });
    app.bundle = bundle;
    return app;
  }

  run() {
    console.log(`Running app: ${this.config.name}`);
    if (this.bundle) {
      desktopShell.launchApp(this);
    } else {
      this.config.main(this, ...(this.config.argv || []));
    }
  }
}
