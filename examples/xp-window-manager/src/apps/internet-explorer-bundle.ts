import type { AppBundle } from "../../../../packages/desktop/src/app.js";

export const internetExplorerAppBundle: AppBundle = {
  executable: "explorer.exe",
  displayName: "Internet Explorer",
  icon: "/desktop/internet-explorer.png",
  width: 980,
  height: 680,
  load: () => import("./internet-explorer.js"),
};
