import {
  CallChainImpl,
  createCall,
  dequery,
  type Dequery,
} from "defuss";
import { DefussDesktopAppIcon, type DesktopIconConfig } from "./desktop.js";
import { DefussApp, type DefussAppConfig } from "./app.js";

export class DequeryWithWindowManager<NT> extends CallChainImpl<
  NT,
  DequeryWithWindowManager<NT> & Dequery<NT>
> {
  /*
  // create a window from any element (not necessarily identifier as an App)
  createDesktopWindow(options: CreateWindowOptions): PromiseLike<Window> {
    return createCall(this, "createWindow", async () => {
      return new WindowManager(options) as NT;
    }) as unknown as PromiseLike<Window>;
  }
  */

  // register an app to the desktop shell
  createDesktopApp(options: DefussAppConfig): PromiseLike<DefussApp> {
    return createCall(this, "createDesktopApp", async () => {
      return new DefussApp(options) as NT;
    }) as unknown as PromiseLike<DefussApp>;
  }

  // create a desktop app icon
  createDesktopAppIcon(
    options: DesktopIconConfig,
  ): PromiseLike<DefussDesktopAppIcon> {
    return createCall(this, "createDesktopAppIcon", async () => {
      return new DefussDesktopAppIcon(options) as NT;
    }) as unknown as PromiseLike<DefussDesktopAppIcon>;
  }
}

/**
 * Extended dequery function with window management capabilities.
 *
 * @param selector - CSS selector, element, or NodeList to query
 * @param options - Optional dequery options
 * @returns Extended dequery instance with createWindow and createTaskbar methods
 */
export const $ = dequery.extend(DequeryWithWindowManager, [
  "createDesktopApp",
  "createWindow",
  "createDesktopAppIcon",
]);
