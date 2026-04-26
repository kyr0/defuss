import { createServer } from "vite";
import defuss from "defuss-vite";

import type { DevOptions, Status } from "./types.js";
import { validateProjectDir } from "./validation.js";
import { defussSsg } from "./vite.js";

/**
 * Start the Vite-backed development server for defuss-ssg.
 */
export const dev = async ({
  projectDir,
  debug = false,
  host = true,
  port = 3000,
  writeDevOutput = true,
}: DevOptions): Promise<Status> => {
  const projectDirStatus = validateProjectDir(projectDir);
  if (projectDirStatus.code !== "OK") return projectDirStatus;

  const server = await createServer({
    root: projectDir,
    configFile: false,
    appType: "custom",
    server: {
      host,
      port,
      watch: {
        ignored: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.ssg-temp/**",
          "**/.endpoints/**",
          "**/.rpc/**",
        ],
      },
    },
    plugins: [
      defuss({ enableJsxDevMode: true }),
      ...defussSsg({
        projectDir,
        debug,
        writeDevOutput,
      }),
    ],
  });

  await server.listen();
  server.printUrls();

  return {
    code: "OK",
    message: `Vite dev server running for ${projectDir}`,
  };
};