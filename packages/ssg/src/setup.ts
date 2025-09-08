import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
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
    execSync(`${pm} install`, { cwd: projectDir, stdio: "inherit" });
    console.log("Dependencies installed successfully.");
  } catch (error) {
    return {
      code: "INSTALL_FAILED",
      message: `Failed to install dependencies: ${(error as Error).message}`,
    };
  }
  return { code: "OK", message: "Setup completed successfully" };
};
