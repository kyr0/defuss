import type { I18nStore } from "./i18n.js";

declare global {
  namespace globalThis {
    var __defuss_i18n: I18nStore | undefined;
  }
}
