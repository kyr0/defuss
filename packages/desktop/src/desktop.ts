import type { DefussApp } from "./app.js";
import { taskbarManager } from "./index.js";
import type { Dimensions2D } from "./types.js";

export interface DesktopIconConfig {
  name: string;
  icon: string;
  app: DefussApp;
  x?: number;
  y?: number;
}

export interface DesktopState {
  icons: DesktopIconConfig[];
}

export class DefussDesktopAppIcon {
  constructor(public config: DesktopIconConfig) {}
}

export interface CreateDesktopOptions {
  icons: DefussDesktopAppIcon[];
  iconSize?: "small" | "medium" | "large";
  backgroundImage?: string;
  backgroundImageSize?: "cover" | "contain";
  backgroundRepeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
  backgroundPosition?: "center" | "top" | "bottom" | "left" | "right";
  backgroundColor: string;
}

export const defaultDesktopOptions: CreateDesktopOptions = {
  icons: [],
  backgroundColor: "#000",
};

export class DesktopManager {
  el?: HTMLElement;
  state?: DesktopState;

  constructor(public options: CreateDesktopOptions = defaultDesktopOptions) {}

  init(el: HTMLElement, options: CreateDesktopOptions = this.options) {
    this.options = options;
    this.el = el;

    // re-initialize state (if state exists, then from state otherwise init state from options)
    this.state = this.state || {
      icons: this.options.icons.map((icon) => icon.config),
    };

    this.render(el);
  }

  render(el: HTMLElement) {
    el.style.backgroundColor = this.options.backgroundColor;

    if (this.options.backgroundImage) {
      el.style.backgroundImage = `url(${this.options.backgroundImage})`;
    }

    if (this.options.backgroundImageSize) {
      el.style.backgroundSize = this.options.backgroundImageSize || "cover";
    }

    if (this.options.backgroundRepeat) {
      el.style.backgroundRepeat = this.options.backgroundRepeat || "no-repeat";
    }
    if (this.options.backgroundPosition) {
      el.style.backgroundPosition = this.options.backgroundPosition || "center";
    }
  }

  addIcon(icon: DefussDesktopAppIcon) {
    this.options.icons.push(icon);
    console.log(`Icon added: ${icon.config.name}`);
  }

  getDimensions(): Dimensions2D {
    if (!this.el) {
      throw new Error("Desktop not initialized. Call init() first.");
    }
    return {
      width: this.el.offsetWidth,
      height: this.el.offsetHeight - taskbarManager.getDimensions().height, // destop is root element minus taskbar height
    };
  }
}

// Ensure singleton of DefussDesktop module-wide
globalThis.__defussDesktopManager =
  globalThis.__defussDesktopManager || new DesktopManager();

export const desktopManager = globalThis.__defussDesktopManager;
