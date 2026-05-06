import { build } from "./build.js";
import { runContainerCommand } from "./container.js";
import { dev } from "./dev.js";
import { serve } from "./serve.js";
import { resolve } from "node:path";
import { setup } from "./setup.js";

const usage = `Usage: defuss-ssg [dev|build|serve|docker-dev|docker-build|docker-serve] [folder] [options]
  No args           => dev .
  Single path       => dev <path>
  Single command    => <command> .
  Command + folder  => <command> <folder>
  Flags:
    --debug, -d
    --multicore
    --port, -p <number>
    --host, -H <host>
		--skip-setup
		--docker-args <args...>`;

const isTruthy = (value?: string): boolean => {
	if (!value) return false;
	return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const isDefussWorkerProcess = (): boolean =>
	typeof process.env.DEFUSS_WORKER_INDEX === "string";

const readFlagValue = (args: string[], index: number, flag: string): string => {
	const next = args[index + 1];
	if (!next || next.startsWith("-")) {
		throw new Error(`Missing value for ${flag}`);
	}

	return next;
};

const parsePort = (value: string): number => {
	const port = Number(value);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`Invalid port: ${value}`);
	}

	return port;
};

const parseCliArgs = (args: string[]) => {
	const dockerArgsIndex = args.indexOf("--docker-args");
	const cliArgs =
		dockerArgsIndex === -1 ? args : args.slice(0, dockerArgsIndex);
	const dockerArgs =
		dockerArgsIndex === -1 ? [] : args.slice(dockerArgsIndex + 1);

	let debug = false;
	let multicore = false;
	let skipSetup =
		isTruthy(process.env.DEFUSS_SSG_SKIP_SETUP) || isDefussWorkerProcess();
	let port: number | undefined;
	let host: string | undefined;
	const positional: string[] = [];

	for (let index = 0; index < cliArgs.length; index += 1) {
		const arg = cliArgs[index];

		if (arg === "--debug" || arg === "-d") {
			debug = true;
			continue;
		}

		if (arg === "--multicore") {
			multicore = true;
			continue;
		}

		if (arg === "--skip-setup" || arg === "--no-setup") {
			skipSetup = true;
			continue;
		}

		if (arg === "--port" || arg === "-p") {
			port = parsePort(readFlagValue(args, index, arg));
			index += 1;
			continue;
		}

		if (arg.startsWith("--port=")) {
			port = parsePort(arg.slice("--port=".length));
			continue;
		}

		if (arg === "--host" || arg === "-H") {
			host = readFlagValue(args, index, arg);
			index += 1;
			continue;
		}

		if (arg.startsWith("--host=")) {
			host = arg.slice("--host=".length);
			if (!host) {
				throw new Error("Missing value for --host");
			}
			continue;
		}

		positional.push(arg);
	}

	return {
		debug,
		dockerArgs,
		multicore,
		skipSetup,
		port,
		host,
		positional,
	};
};

(async () => {
	const args = process.argv.slice(2);
	const commands = new Set([
		"dev",
		"build",
		"serve",
		"docker-dev",
		"docker-build",
		"docker-serve",
	]);
	const containerCommands = new Set([
		"docker-dev",
		"docker-build",
		"docker-serve",
	]);

	let debug: boolean;
	let dockerArgs: string[];
	let multicore: boolean;
	let skipSetup: boolean;
	let port: number | undefined;
	let host: string | undefined;
	let positional: string[];

	try {
		({ debug, dockerArgs, multicore, skipSetup, port, host, positional } =
			parseCliArgs(args));
	} catch (error) {
		console.error(
			`${error instanceof Error ? error.message : "Invalid CLI arguments"}\n${usage}`,
		);
		process.exit(1);
	}

	let command: string;
	let folder: string;

	if (positional.length === 0) {
		// No args => dev .
		command = "dev";
		folder = ".";
	} else if (positional.length === 1) {
		const arg = positional[0];
		if (commands.has(arg)) {
			// Single command => that command on .
			command = arg;
			folder = ".";
		} else {
			// Single path => dev that path
			command = "dev";
			folder = arg;
		}
	} else if (positional.length === 2) {
		// Two args => command + folder
		if (!commands.has(positional[0])) {
			console.error(usage);
			process.exit(1);
		}
		command = positional[0];
		folder = positional[1];
	} else {
		console.error(usage);
		process.exit(1);
	}

	const projectDir = resolve(folder);
	const workerProcess = isDefussWorkerProcess();
	const isContainerCommand = containerCommands.has(command);

	if (!isContainerCommand && dockerArgs.length > 0) {
		console.error(
			`--docker-args can only be used with docker-dev, docker-build, or docker-serve.\n${usage}`,
		);
		process.exit(1);
	}

	if (isContainerCommand) {
		await runContainerCommand({
			command: command as "docker-dev" | "docker-build" | "docker-serve",
			projectDir,
			debug,
			host,
			port,
			multicore,
			skipSetup,
			dockerArgs,
		});
		return;
	}

	if (skipSetup) {
		if (!workerProcess) {
			console.log(
				`Skipping dependency setup for ${folder} (prepared environment).`,
			);
		}
	} else {
		const setupStatus = await setup(projectDir);
		if (setupStatus.code !== "OK") {
			console.error(setupStatus.message);
			process.exit(1);
		}
	}

	if (command === "dev") {
		if (!workerProcess) {
			console.log(`Starting Vite dev server for ${folder}...`);
		}
		await dev({
			projectDir,
			debug,
			host,
			port,
			writeDevOutput: true,
		});
	} else if (command === "build") {
		if (!workerProcess) {
			console.log(`Building ${folder}...`);
		}
		await build({
			projectDir,
			debug,
			mode: "build",
		});
	} else if (command === "serve") {
		if (!workerProcess) {
			console.log(`Serving built output for ${folder}...`);
		}
		await serve({
			projectDir,
			debug,
			host,
			port,
			workers: multicore ? "auto" : 1,
		});
	} else {
		console.error(usage);
		process.exit(1);
	}
})();
