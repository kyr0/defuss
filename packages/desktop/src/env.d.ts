import type { Desktop } from "./desktop.js";
import type { DesktopShell } from "./shell.ts";
import type { Taskbar } from "./taskbar.ts";

declare global {
  var __defussDesktopShell: DesktopShell;
  var __defussDesktop: Desktop;
  var __defussTaskbar: Taskbar;
}
