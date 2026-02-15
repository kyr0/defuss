import { build } from "./build.js";
import { serve } from "./serve.js";
import { resolve } from "node:path";
import { setup } from "./setup.js";

(async () => {
  const args = process.argv.slice(2);
  const debug = args.includes("--debug") || args.includes("-d");
  const positional = args.filter((a) => !a.startsWith("-"));
  const command = positional[0];
  const folder = positional[1];
  const usage = "Usage: defuss-ssg <build|serve> <folder> [--debug]";

  if (!command || !folder) {
    console.error(usage);
    process.exit(1);
  }

  const projectDir = resolve(folder);

  // initialize the project (if not already done)
  await setup(projectDir);

  if (command === "build") {
    console.log(`Building ${folder}...`);
    await build({
      projectDir,
      debug,
      mode: "build",
    });
  } else if (command === "serve") {
    console.log(`Serving ${folder}...`);
    await serve({
      projectDir,
      debug,
      mode: "serve",
    });
  } else {
    console.error(usage);
    process.exit(1);
  }
})();
