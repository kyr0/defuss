import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import type { Status } from "./types.js";
import { validateProjectDir } from "./validation.js";

/**
 * Check if a dependency can be resolved from `dir` (i.e. exists in some
 * ancestor node_modules thanks to workspace hoisting or prior install).
 */
const canResolve = (dep: string, dir: string): boolean => {
  let current = dir;
  while (true) {
    if (existsSync(join(current, "node_modules", dep))) return true;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return false;
};

/**
 * Run a package manager command and stream output with a rolling window.
 * Rejects if the process exits with a non-zero code.
 */
const runInstall = (cmd: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
      env: env ?? process.env,
    });

    const lastLines: string[] = [];
    let printedLines = 0;

    const pushLine = (line: string) => {
      lastLines.push(line);
      if (lastLines.length > 3) lastLines.shift();
      if (process.stdout.isTTY) {
        for (let i = 0; i < printedLines; i++) {
          process.stdout.write("\x1b[1A\x1b[2K");
        }
        for (const l of lastLines) {
          process.stdout.write(`${l}\n`);
        }
        printedLines = lastLines.length;
      } else {
        process.stdout.write(`${line}\n`);
      }
    };

    const handleData = (chunk: Buffer) => {
      const lines = chunk.toString().split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
      for (const line of lines) pushLine(line);
    };

    child.stdout?.on("data", handleData);
    child.stderr?.on("data", handleData);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });

/**
 * Sets up a project folder by installing dependencies from its package.json.
 * If all deps are already resolvable (e.g. via workspace hoisting or a
 * previous install), the install step is skipped entirely.
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

  // ── Dependency resolution check ────────────────────────────────────
  // If all required deps already exist in an ancestor node_modules
  // (e.g. workspace hoisting or a previous install), skip `install`
  // entirely — avoids workspace:* resolution errors in monorepos.
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const depNames = Object.keys(allDeps).filter(
    (d) => d !== "defuss-ssg", // skip self-reference (we're already running)
  );
  const allResolvable =
    depNames.length === 0 || depNames.every((d) => canResolve(d, projectDir));

  if (allResolvable) {
    console.log(
      `All dependencies already available — skipping install.`,
    );
    return { code: "OK", message: "Setup completed (deps already available)" };
  }

  console.log(`Setting up project in ${projectDir} using ${pm}...`);

  // For bun: trust esbuild before install so its postinstall script runs
  if (pm === "bun") {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(pm, ["pm", "trust", "esbuild"], {
          cwd: projectDir,
          shell: true,
          stdio: "ignore",
          env: { ...process.env, BUN_WORKSPACE_ROOT: projectDir },
        });
        child.on("error", reject);
        child.on("close", () => resolve());
      });
    } catch {
      // non-fatal — install may still work
    }
  }

  try {
    const bunEnv = { ...process.env, BUN_WORKSPACE_ROOT: projectDir };
    await runInstall(pm, ["install", "--linker", "isolated"], projectDir,
      pm === "bun" ? bunEnv : undefined,
    );
    console.log("Dependencies installed successfully.");
  } catch (error) {
    if (pm === "bun") {
      console.warn(
        `Warning: ${(error as Error).message}\nFalling back to npm install...`,
      );
      try {
        await runInstall("npm", ["install"], projectDir);
        console.log("Dependencies installed successfully via npm.");
      } catch (npmError) {
        console.warn(
          `Warning: npm install also failed: ${(npmError as Error).message}\nContinuing anyway — dependencies may already be available.`,
        );
      }
    } else {
      console.warn(
        `Warning: ${(error as Error).message}\nContinuing anyway — dependencies may already be available.`,
      );
    }
  }
  return { code: "OK", message: "Setup completed successfully" };
};
