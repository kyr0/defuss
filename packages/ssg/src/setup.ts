import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import type { Status } from "./types.js";
import { validateProjectDir } from "./validation.js";

/**
 * Check if a dependency can be resolved from `dir` (i.e. exists in some
 * ancestor node_modules thanks to workspace hoisting or a previous install).
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
const runInstall = (
	cmd: string,
	args: string[],
	cwd: string,
	env?: NodeJS.ProcessEnv,
): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd,
			shell: process.platform === "win32",
			stdio: ["inherit", "pipe", "pipe"],
			env: env ?? process.env,
		});

		const lastLines: string[] = [];
		let printedLines = 0;

		const pushLine = (line: string) => {
			lastLines.push(line);
			if (lastLines.length > 3) lastLines.shift();
			if (process.stdout.isTTY) {
				for (let index = 0; index < printedLines; index += 1) {
					process.stdout.write("\x1b[1A\x1b[2K");
				}
				for (const outputLine of lastLines) {
					process.stdout.write(`${outputLine}\n`);
				}
				printedLines = lastLines.length;
			} else {
				process.stdout.write(`${line}\n`);
			}
		};

		const handleData = (chunk: Buffer) => {
			const lines = chunk
				.toString()
				.split(/\r\n|\n|\r/)
				.filter((line) => line.trim().length > 0);
			for (const line of lines) pushLine(line);
		};

		child.stdout?.on("data", handleData);
		child.stderr?.on("data", handleData);
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(
				new Error(
					`${cmd} ${args.join(" ")} exited with code ${code ?? "unknown"}`,
				),
			);
		});
	});

const getInstallCommand = (
	pm: string,
	projectDir: string,
): {
	cmd: string;
	args: string[];
	env?: NodeJS.ProcessEnv;
} => {
	if (pm === "bun") {
		return {
			cmd: "bun",
			args: ["install", "--no-cache"],
			env: { ...process.env, BUN_WORKSPACE_ROOT: projectDir },
		};
	}

	if (pm === "yarn") {
		return {
			cmd: "corepack",
			args: ["yarn", "install"],
		};
	}

	if (pm === "pnpm") {
		return {
			cmd: "corepack",
			args: ["pnpm", "install"],
		};
	}

	return {
		cmd: "npm",
		args: ["install"],
	};
};

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
	const pm = packageManager.split("@")[0];
	const validPMs = ["bun", "npm", "yarn", "pnpm"];
	if (!validPMs.includes(pm)) {
		return {
			code: "UNSUPPORTED_PM",
			message: `Unsupported package manager: ${pm}`,
		};
	}

	const allDeps = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
	};
	const depNames = Object.keys(allDeps);
	const allResolvable =
		depNames.length === 0 ||
		depNames.every((dependency) => canResolve(dependency, projectDir));

	if (allResolvable) {
		console.log("All dependencies already available - skipping install.");
		return { code: "OK", message: "Setup completed (deps already available)" };
	}

	console.log(`Setting up project in ${projectDir} using ${pm}...`);

	if (pm === "bun") {
		try {
			await new Promise<void>((resolve, reject) => {
				const child = spawn("bun", ["pm", "trust", "esbuild"], {
					cwd: projectDir,
					shell: process.platform === "win32",
					stdio: "ignore",
					env: { ...process.env, BUN_WORKSPACE_ROOT: projectDir },
				});
				child.on("error", reject);
				child.on("close", () => resolve());
			});
		} catch {
			// non-fatal - install may still work
		}
	}

	try {
		const installCommand = getInstallCommand(pm, projectDir);
		await runInstall(
			installCommand.cmd,
			installCommand.args,
			projectDir,
			installCommand.env,
		);
		console.log("Dependencies installed successfully.");
		return { code: "OK", message: "Setup completed successfully" };
	} catch (error) {
		return {
			code: "INSTALL_FAILED",
			message: `Failed to install dependencies with ${pm}: ${(error as Error).message}`,
		};
	}
};
