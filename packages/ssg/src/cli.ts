import { build } from "./build.js";
import { dev } from "./dev.js";
import { serve } from "./serve.js";
import { resolve } from "node:path";
import { setup } from "./setup.js";

(async () => {
	const args = process.argv.slice(2);
	const debug = args.includes("--debug") || args.includes("-d");
	const multicore = args.includes("--multicore");
	const positional = args.filter((a) => !a.startsWith("-"));
	const usage = "Usage: defuss-ssg [dev|build|serve] [folder]\n  No args           => serve .\n  Single path       => serve <path>\n  Single command    => <command> .\n  Command + folder  => <command> <folder>\n  Flags: [--debug] [--multicore]";

	let command: string;
	let folder: string;

	if (positional.length === 0) {
		// No args => serve .
		command = "serve";
		folder = ".";
	} else if (positional.length === 1) {
		const arg = positional[0];
		if (arg === "dev" || arg === "build" || arg === "serve") {
			// Single command => that command on .
			command = arg;
			folder = ".";
		} else if (arg.startsWith(".") || arg.startsWith("/")) {
			// Single path => serve that path
			command = "serve";
			folder = arg;
		} else {
			console.error(usage);
			process.exit(1);
		}
	} else {
		// Two args => command + folder
		command = positional[0];
		folder = positional[1];
	}

	const projectDir = resolve(folder);

	// initialize the project (if not already done)
	await setup(projectDir);

	if (command === "dev") {
		console.log(`Starting Vite dev server for ${folder}...`);
		await dev({
			projectDir,
			debug,
			writeDevOutput: true,
		});
	} else if (command === "build") {
		console.log(`Building ${folder}...`);
		await build({
			projectDir,
			debug,
			mode: "build",
		});
	} else if (command === "serve") {
		console.log(`Serving built output for ${folder}...`);
		await serve({
			projectDir,
			debug,
			workers: multicore ? "auto" : 1,
		});
	} else {
		console.error(usage);
		process.exit(1);
	}
})();
