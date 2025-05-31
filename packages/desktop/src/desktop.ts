import type { DefussApp } from "./app.js";
import type { Window } from "./window.js";

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

export class Desktop {
  el?: HTMLElement;
  state?: DesktopState;

  constructor(
    public options: CreateDesktopOptions = {
      icons: [],
      backgroundColor: "#000",
    },
  ) {}

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

    el.style.backgroundSize = this.options.backgroundImageSize || "cover";
    el.style.backgroundRepeat = this.options.backgroundRepeat || "no-repeat";
    el.style.backgroundPosition = this.options.backgroundPosition || "center";

    // TODO: Use ReGUI RasterView for rendering icons
  }

  addIcon(icon: DefussDesktopAppIcon) {
    this.options.icons.push(icon);
    console.log(`Icon added: ${icon.config.name}`);
  }

  placeWindow(window: Window) {
    if (!this.el) {
      console.warn("Desktop not initialized. Call decorate() first.");
      return;
    }

    // TODO:
    window.el!.style.left = `${window.options.x}px`;
    window.el!.style.top = `${window.options.y}px`;

    // move the window.el from the previous parent to the desktop element
    if (window.el?.parentElement) {
      window.el.parentElement.removeChild(window.el);
    }
    // append the window element to the desktop element
    this.el.appendChild(window.el!);
  }
}

// Ensure singleton of DefussDesktop module-wide
globalThis.__defussDesktop = globalThis.__defussDesktop || new Desktop();

export const desktop = globalThis.__defussDesktop;
