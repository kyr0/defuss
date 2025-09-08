import { statSync } from "node:fs";
import type { Status } from "./types.js";

/**
 * Validates the project directory.
 * @param projectDir The path to the project directory.
 * @returns A status object indicating the result of the validation.
 */
export const validateProjectDir = (projectDir: string): Status => {
  try {
    if (!statSync(projectDir).isDirectory()) {
      return {
        code: "MISSING_PROJECT_DIR",
        message: `Project directory is not a directory: ${projectDir}`,
      };
    }
  } catch (error) {
    return {
      code: "INVALID_PROJECT_DIR",
      message: `Error accessing project directory: ${(error as Error).message}`,
    };
  }
  return { code: "OK", message: "Project directory is valid." };
};
