import type { DesktopManager } from "./desktop.js";
import type { DesktopShellManager } from "./shell.ts";
import type { SoundManager } from "./sound.ts";
import type { TaskbarManager } from "./taskbar.ts";

declare global {
  var __defussDesktopShellManager: DesktopShellManager;
  var __defussDesktopManager: DesktopManager;
  var __defussTaskbarManager: TaskbarManager;
  var __defussSoundManager: SoundManager;
}
