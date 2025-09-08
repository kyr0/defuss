import { build } from "./build.js";
import { serve } from "./serve.js";
import { resolve } from "node:path";

(async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const folder = args[1];
  const usage = "Usage: defuss-ssg <build|serve> <folder>";

  if (!command || !folder) {
    console.error(usage);
    process.exit(1);
  }

  const projectDir = resolve(folder);

  if (command === "build") {
    console.log(`Building ${folder}...`);
    await build({
      projectDir,
      debug: true,
      mode: "build",
    });
  } else if (command === "serve") {
    console.log(`Serving ${folder}...`);
    await serve({
      projectDir,
      debug: true,
      mode: "serve",
    });
  } else {
    console.error(usage);
    process.exit(1);
  }
})();
