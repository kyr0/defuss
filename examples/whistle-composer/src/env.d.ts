/// <reference path="../.astro/types.d.ts" />
/// <reference path="astro/client" />

import type { AppProps } from "./models/app";

declare global {
  namespace App {
    interface Locals {
      APP_PROPS: AppProps | null;
    }
  }
  interface Window {
    $APP_PROPS: AppProps | null;
  }
}
