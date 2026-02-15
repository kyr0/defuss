import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { Status } from "./types.js";
import { validateProjectDir } from "./validation.js";

/**
 * Sets up a project folder by installing dependencies from its package.json
 * @param projectDir - The path to the project directory
 * @returns An object with status and optional message
 */
export const setup = async (projectDir: string): Promise<Status> => {
  const projectDirStatus = validateProjectDir(projectDir);
  if (projectDirStatus.code !== "OK") return projectDirStatus;

  const packageJsonPath = join(projectDir, "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      code: "MISSING_PACKAGE_JSON",
      message: `package.json not found in ${projectDir}`,
    };
  }

  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  } catch (error) {
    return {
      code: "INVALID_JSON",
      message: `Error reading package.json in ${projectDir}: ${(error as Error).message}`,
    };
  }

  const packageManager = packageJson.packageManager || "npm";

  // extract and validate package manager
  const pm = packageManager.split("@")[0];
  const validPMs = ["npm", "yarn", "pnpm", "bun"];
  if (!validPMs.includes(pm)) {
    return {
      code: "UNSUPPORTED_PM",
      message: `Unsupported package manager: ${pm}`,
    };
  }

  console.log(`Setting up project in ${projectDir} using ${pm}...`);

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(pm, ["install"], {
        cwd: projectDir,
        shell: true,
        stdio: ["inherit", "pipe", "pipe"],
      });

      // rolling window of the last 3 output lines
      const lastLines: string[] = [];
      let printedLines = 0;

      const pushLine = (line: string) => {
        lastLines.push(line);
        if (lastLines.length > 3) lastLines.shift();

        if (process.stdout.isTTY) {
          // erase previously printed rolling lines, then re-print
          for (let i = 0; i < printedLines; i++) {
            process.stdout.write("\x1b[1A\x1b[2K"); // cursor up + clear line
          }
          for (const l of lastLines) {
            process.stdout.write(`${l}\n`);
          }
          printedLines = lastLines.length;
        } else {
          // non-TTY: just stream normally
          process.stdout.write(`${line}\n`);
        }
      };

      const handleData = (chunk: Buffer) => {
        const lines = chunk
          .toString()
          .split(/\r\n|\n|\r/)
          .filter((l) => l.trim().length > 0);
        for (const line of lines) {
          pushLine(line);
        }
      };

      child.stdout?.on("data", handleData);
      child.stderr?.on("data", handleData);

      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `${pm} install exited with code ${code ?? "unknown"}`,
            ),
          );
        }
      });
    });
    console.log("Dependencies installed successfully.");
  } catch (error) {
    return {
      code: "INSTALL_FAILED",
      message: `Failed to install dependencies: ${(error as Error).message}`,
    };
  }
  return { code: "OK", message: "Setup completed successfully" };
};
