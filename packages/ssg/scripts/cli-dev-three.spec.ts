import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { afterEach, describe, expect, test } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = resolve(__dirname, "..");
const cliPath = resolve(packageDir, "dist/cli.mjs");
const projectDir = resolve(packageDir, "../../examples/vad-three.js-talking-head");

type StartedServer = {
	child: ChildProcessWithoutNullStreams;
	url: string;
	getOutput: () => string;
};

let activeServer: StartedServer | null = null;

const startServer = async (): Promise<StartedServer> => {
	const child = spawn("node", [cliPath, "dev", projectDir], {
		cwd: packageDir,
		env: process.env,
		stdio: ["ignore", "pipe", "pipe"],
	});

	let output = "";
	const appendOutput = (chunk: Buffer) => {
		output += chunk.toString();
	};

	child.stdout.on("data", appendOutput);
	child.stderr.on("data", appendOutput);

	const server = await new Promise<StartedServer>((resolveServer, rejectServer) => {
		const timeoutId = setTimeout(() => {
			rejectServer(
				new Error(`Timed out waiting for dev server.\n${output}`),
			);
		}, 60000);

		const tryResolve = () => {
			const match = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)\//);
			if (!match) {
				return;
			}

			clearTimeout(timeoutId);
			resolveServer({
				child,
				url: `http://127.0.0.1:${match[1]}/`,
				getOutput: () => output,
			});
		};

		child.stdout.on("data", tryResolve);
		child.stderr.on("data", tryResolve);
		child.on("exit", (code, signal) => {
			clearTimeout(timeoutId);
			rejectServer(
				new Error(
					`Dev server exited before ready (code=${code}, signal=${signal}).\n${output}`,
				),
			);
		});
	});

	activeServer = server;
	return server;
};

const stopServer = async (server: StartedServer | null): Promise<void> => {
	if (!server) {
		return;
	}

	const { child } = server;
	if (child.killed || child.exitCode !== null) {
		return;
	}

	child.kill("SIGTERM");
	await once(child, "exit");
};

afterEach(async () => {
	await stopServer(activeServer);
	activeServer = null;
});

describe("cli-dev with vad-three.js-talking-head", () => {
	test(
		"hydrates avatar-demo-screen without console errors",
		async () => {
			const server = await startServer();
			const browser = await chromium.launch({ headless: true });
			const page = await browser.newPage();

			const consoleErrors: string[] = [];
			const consoleMessages: string[] = [];

			page.on("console", (message) => {
				const text = message.text();
				consoleMessages.push(`[${message.type()}] ${text}`);
				if (
					message.type() === "error" ||
					/Hydration error|Mismatched number of VNodes|No hydratable export|No default export/.test(
						text,
					)
				) {
					consoleErrors.push(text);
				}
			});

			page.on("pageerror", (error) => {
				consoleErrors.push(String(error));
			});

			await page.goto(server.url, {
				waitUntil: "networkidle",
				timeout: 60000,
			});
			await page.waitForFunction(
				() => Boolean(document.querySelector('[data-hydrated="true"]')),
				{ timeout: 30000 },
			);

			const pageState = await page.evaluate(() => {
				const boundary = document.querySelector('[data-hydrate="true"]');
				const shell = document.querySelector(".demo-shell");
				const shellStyle = shell ? getComputedStyle(shell) : null;

				return {
					boundaryTag: boundary?.tagName ?? null,
					hasUndefinedElement: Boolean(document.querySelector("undefined")),
					shellDisplay: shellStyle?.display ?? null,
					shellGridTemplateColumns: shellStyle?.gridTemplateColumns ?? null,
				};
			});

			await browser.close();

			expect(consoleErrors, consoleMessages.join("\n")).toEqual([]);
			expect(consoleMessages.some((message) => message.includes("Hydration complete"))).toBe(true);
			expect(pageState.hasUndefinedElement).toBe(false);
			expect(pageState.boundaryTag).toBe("DIV");
			expect(pageState.shellDisplay).toBe("grid");
			expect(pageState.shellGridTemplateColumns).not.toBe("none");
		},
		120000,
	);
});
