import type { AppBundle } from "../../../../packages/desktop/src/app.js";

export const notepadAppBundle: AppBundle = {
  executable: "notepad.exe",
  displayName: "Notepad",
  icon: "/desktop/documents.png",
  width: 760,
  height: 520,
  load: () => import("./notepad.js"),
};
