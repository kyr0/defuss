import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readConfig } from "./config.js";
import type { ContainerRuntime } from "./types.js";

export const CONTAINER_IMAGE_TAG = "defuss-ssg";
export const CONTAINER_WORKSPACE_DIR = "/workspace";
export const CONTAINER_NODE_MODULES_DIR = `${CONTAINER_WORKSPACE_DIR}/node_modules`;
export const DEFAULT_CONTAINER_PORT = 3000;
export const GENERATED_DOCKERFILE_NAME = "Dockerfile";

export const createDockerfile = (packageTarballName: string): string => `# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9 AS bun

FROM node:24-trixie-slim

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \\
	&& apt-get install -y --no-install-recommends ca-certificates git \\
	&& git config --global --add url."https://github.com/".insteadOf ssh://git@github.com/ \\
	&& git config --global --add url."https://github.com/".insteadOf git+ssh://git@github.com/ \\
	&& git config --global --add url."https://github.com/".insteadOf git@github.com: \\
\t&& rm -rf /var/lib/apt/lists/*

COPY ${packageTarballName} /tmp/${packageTarballName}
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -sf /usr/local/bin/bun /usr/local/bin/bunx \\
	&& npm install -g /tmp/${packageTarballName} \\
	&& rm -f /tmp/${packageTarballName} \\
	&& npm cache clean --force

ENTRYPOINT ["defuss-ssg"]
CMD ["dev", "/workspace", "--host", "0.0.0.0", "--port", "3000"]
`;

export const getPackageRootDir = (): string =>
	fileURLToPath(new URL("../", import.meta.url));

export const packCurrentPackage = (tempDir: string): string => {
	const packageRootDir = getPackageRootDir();
	const result = spawnSync(
		"npm",
		["pack", "--json", "--pack-destination", tempDir],
		{
			cwd: packageRootDir,
			encoding: "utf8",
			shell: process.platform === "win32",
		},
	);

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(
			result.stderr || "Failed to pack the current defuss-ssg package.",
		);
	}

	const output = JSON.parse(result.stdout) as Array<{ filename?: string }>;
	const tarballName = output.at(0)?.filename;
	if (!tarballName) {
		throw new Error("npm pack did not return a package tarball name.");
	}

	return tarballName;
};

export const getNodeModulesVolumeName = (projectDir: string): string => {
	const safeBaseName =
		basename(projectDir)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "project";
	const hash = createHash("sha256")
		.update(projectDir)
		.digest("hex")
		.slice(0, 12);

	return `defuss-ssg-node-modules-${safeBaseName}-${hash}`;
};

export const hasCommand = (command: string): boolean => {
	const result = spawnSync(command, ["--version"], {
		stdio: "ignore",
		shell: process.platform === "win32",
	});

	return !result.error && result.status === 0;
};

export const resolveContainerRuntime = async (
	projectDir: string,
	debug: boolean,
): Promise<ContainerRuntime> => {
	const configuredRuntime = (await readConfig(projectDir, debug)).containerRuntime;
	if (configuredRuntime) {
		if (!hasCommand(configuredRuntime)) {
			throw new Error(
				`Configured containerRuntime \"${configuredRuntime}\" is not available on PATH.`,
			);
		}

		return configuredRuntime;
	}

	if (hasCommand("docker")) {
		return "docker";
	}

	if (hasCommand("podman")) {
		return "podman";
	}

	throw new Error(
		"Neither docker nor podman is available on PATH. Install one of them or set containerRuntime in config.ts.",
	);
};

export const runContainerRuntime = (
	runtime: ContainerRuntime,
	args: string[],
	label: string,
	cwd?: string,
): void => {
	const result = spawnSync(runtime, args, {
		cwd,
		stdio: "inherit",
		shell: process.platform === "win32",
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(
			`${runtime} ${args.join(" ")} failed while ${label} with code ${result.status ?? "unknown"}`,
		);
	}
};

export const hasPublishArgs = (containerArgs: string[]): boolean => {
	for (let index = 0; index < containerArgs.length; index += 1) {
		const arg = containerArgs[index];
		if (
			arg === "-p" ||
			arg === "-P" ||
			arg === "--publish" ||
			arg === "--publish-all" ||
			arg.startsWith("--publish=")
		) {
			return true;
		}
	}

	return false;
};

export const extractHostNetworkArgs = (
	containerArgs: string[],
): {
	remainingArgs: string[];
	hostNetworkRequested: boolean;
} => {
	const remainingArgs: string[] = [];
	let hostNetworkRequested = false;

	for (let index = 0; index < containerArgs.length; index += 1) {
		const arg = containerArgs[index];

		if (arg === "--net=host" || arg === "--network=host") {
			hostNetworkRequested = true;
			continue;
		}

		if ((arg === "--net" || arg === "--network") && containerArgs[index + 1] === "host") {
			hostNetworkRequested = true;
			index += 1;
			continue;
		}

		remainingArgs.push(arg);
	}

	return {
		remainingArgs,
		hostNetworkRequested,
	};
};

export type ContainerCommand = "container-dev" | "container-build" | "container-serve";

export interface RunContainerCommandOptions {
	command: ContainerCommand;
	projectDir: string;
	debug?: boolean;
	host?: string;
	port?: number;
	multicore?: boolean;
	skipSetup?: boolean;
	containerArgs: string[];
}

export const getInnerCommand = (
	command: ContainerCommand,
): "dev" | "build" | "serve" => command.slice("docker-".length) as "dev" | "build" | "serve";

export const createInnerArgs = ({
	command,
	debug,
	host,
	port,
	multicore,
	skipSetup,
}: Omit<RunContainerCommandOptions, "projectDir" | "containerArgs">): {
	innerArgs: string[];
	selectedPort?: number;
} => {
	const innerCommand = getInnerCommand(command);
	const innerArgs = [innerCommand, CONTAINER_WORKSPACE_DIR];

	if (debug) {
		innerArgs.push("--debug");
	}

	if (innerCommand === "serve" && multicore) {
		innerArgs.push("--multicore");
	}

	if (skipSetup) {
		innerArgs.push("--skip-setup");
	}

	if (innerCommand === "dev" || innerCommand === "serve") {
		const selectedHost = host ?? "0.0.0.0";
		const selectedPort = port ?? DEFAULT_CONTAINER_PORT;
		innerArgs.push("--host", selectedHost, "--port", String(selectedPort));
		return { innerArgs, selectedPort };
	}

	return {
		innerArgs,
		selectedPort: port,
	};
};

export const runContainerCommand = async ({
	command,
	projectDir,
	debug = false,
	host,
	port,
	multicore = false,
	skipSetup = false,
	containerArgs,
}: RunContainerCommandOptions): Promise<void> => {
	const resolvedProjectDir = resolve(projectDir);
	const runtime = await resolveContainerRuntime(resolvedProjectDir, debug);
	const { remainingArgs, hostNetworkRequested } = extractHostNetworkArgs(containerArgs);
	const useHostNetwork = hostNetworkRequested && process.platform === "linux";
	const tempDir = mkdtempSync(join(tmpdir(), "defuss-ssg-container-"));
	const volumeName = getNodeModulesVolumeName(resolvedProjectDir);
	const dockerfilePath = join(tempDir, GENERATED_DOCKERFILE_NAME);
	const { innerArgs, selectedPort } = createInnerArgs({
		command,
		debug,
		host,
		port,
		multicore,
		skipSetup,
	});
	const packageTarballName = packCurrentPackage(tempDir);

	writeFileSync(dockerfilePath, createDockerfile(packageTarballName), "utf8");

	try {
		console.log(`Using ${runtime} for containerized ${getInnerCommand(command)}.`);
		if (hostNetworkRequested && !useHostNetwork) {
			console.warn(
				`Ignoring --network host on ${process.platform}; using published ports for localhost access instead.`,
			);
		}
		runContainerRuntime(
			runtime,
			["build", "-t", CONTAINER_IMAGE_TAG, "-f", GENERATED_DOCKERFILE_NAME, tempDir],
			"building the defuss-ssg container image",
			tempDir,
		);

		const runArgs = [
			"run",
			"--rm",
			...remainingArgs,
			"-v",
			`${resolvedProjectDir}:${CONTAINER_WORKSPACE_DIR}`,
			"-v",
			`${volumeName}:${CONTAINER_NODE_MODULES_DIR}`,
		];

		if (useHostNetwork) {
			runArgs.push("--network", "host");
		}

		if (
			(selectedPort ?? 0) > 0 &&
			(getInnerCommand(command) === "dev" || getInnerCommand(command) === "serve") &&
			!hasPublishArgs(remainingArgs) &&
			!useHostNetwork
		) {
			runArgs.push("-p", `${selectedPort}:${selectedPort}`);
		}

		runArgs.push(CONTAINER_IMAGE_TAG, ...innerArgs);
		runContainerRuntime(
			runtime,
			runArgs,
			`running ${command} for ${resolvedProjectDir}`,
		);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
};
