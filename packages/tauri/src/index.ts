import { execSync, spawn } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { createWriteStream, existsSync, lstatSync, statSync } from "node:fs";
import { chmod, copyFile, cp, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { arch, homedir, platform as osPlatform } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import type {
	DefussTauriOptions,
	DefussTauriPlatform,
	PreparedTauriProject,
	RunResult,
} from "./types.js";
import {
	renderCargoToml,
	renderCapability,
	renderManagedReadme,
	renderMacEntitlements,
	renderMacInfoPlist,
	renderRustLib,
	renderTauriConfig,
} from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_MANAGED_DIR = ".defuss-tauri";
const DEFAULT_SSG_OUTPUT = "dist";
const DEFAULT_TAURI_OUT = "dist-tauri-build";
const DEFAULT_TAURI_OUT_DEV = "dist-tauri-dev";
const DEFAULT_NODE_VERSION = "latest-v22.x";
const DEFAULT_NODE_DIST_BASE_URL = "https://nodejs.org/download/release";
const TAURI_CLI_VERSION = "^2.8.0";
const TAURI_RUST_VERSION = "2";
const TAURI_SHELL_VERSION = "2";
const SIDECAR_NAME = "node";
const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 800;
const DEFAULT_TCP_TIMEOUT_SECS = 45;
const DEFAULT_TCP_POLL_INTERVAL_MS = 150;
const DEFAULT_GRACEFUL_SHUTDOWN_MS = 500;
const MAX_PORT_SCAN_ATTEMPTS = 100;

const isPortFree = (port: number): Promise<boolean> =>
	new Promise((resolve) => {
		const server = createServer();
		server.listen(port, () => {
			server.close(() => resolve(true));
		}).on("error", () => resolve(false));
	});

const findFreePort = async (startPort: number): Promise<number> => {
	for (let port = startPort; port < startPort + MAX_PORT_SCAN_ATTEMPTS; port++) {
		if (await isPortFree(port)) return port;
	}
	throw new Error(`Could not find a free port starting from ${startPort}`);
};

const isTruthy = (value: unknown): boolean =>
	typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase());

const q = (value: string): string => JSON.stringify(value);

const sanitizeProductName = (name: string): string => {
	const cleaned = name
		.replace(/^@[^/]+\//, "")
		.replace(/[-_]+/g, " ")
		.replace(/[^\p{L}\p{N} ]+/gu, " ")
		.trim();
	return (cleaned || "Defuss App").replace(/\b\w/g, (char) => char.toUpperCase());
};

const sanitizeIdentifier = (name: string): string => {
	const cleaned = name
		.toLowerCase()
		.replace(/^@[^/]+\//, "")
		.replace(/[^a-z0-9]+/g, ".")
		.replace(/^\.+|\.+$/g, "")
		.replace(/\.{2,}/g, ".");
	return `tech.defuss.${cleaned || "app"}`;
};

const sanitizeRustName = (identifier: string): string =>
	identifier.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^([0-9])/, "_$1");

const parseJsonSafe = <T>(source: string, fallback: T): T => {
	try {
		return JSON.parse(source) as T;
	} catch {
		return fallback;
	}
};

const maybeReadPackageJson = async (projectDir: string): Promise<Record<string, any>> => {
	const packageJsonPath = join(projectDir, "package.json");
	if (!existsSync(packageJsonPath)) return {};
	return parseJsonSafe(await readFile(packageJsonPath, "utf8"), {});
};

const resolveProjectDir = (projectDir: string): string => resolve(projectDir || ".");

const assertDirectory = (dir: string, label: string): void => {
	if (!existsSync(dir)) throw new Error(`${label} does not exist: ${dir}`);
	if (!statSync(dir).isDirectory()) throw new Error(`${label} is not a directory: ${dir}`);
};

const assertFile = (file: string, label: string): void => {
	if (!existsSync(file)) throw new Error(`${label} does not exist: ${file}`);
	if (!statSync(file).isFile()) throw new Error(`${label} is not a file: ${file}`);
};

const copyDirFresh = async (src: string, dest: string, options?: any): Promise<void> => {
	assertDirectory(src, "Source directory");
	await rm(dest, { recursive: true, force: true });
	await mkdir(dirname(dest), { recursive: true });
	// Always dereference symlinks to avoid "File exists" errors during Tauri bundling
	// when the Node.js distribution contains symlinks (e.g. bin/corepack, bin/npx, bin/npm).
	// Skip broken symlinks (e.g. cross-platform OpenSSL headers that don't exist on this OS).
	await cp(src, dest, {
		recursive: true,
		force: true,
		dereference: true,
		verifier: (srcPath: string, _destPath: string) => {
			try {
				statSync(srcPath);
				return true;
			} catch {
				return false; // skip broken symlinks / missing targets
			}
		},
		...(options || {}),
	});
};

const toPosix = (path: string): string => path.replace(/\\/g, "/");

const relativeFrom = (fromDir: string, targetPath: string): string => {
	const rel = toPosix(relative(fromDir, targetPath));
	return rel.startsWith(".") ? rel : `./${rel}`;
};

const platformMatchesHost = (platform: DefussTauriPlatform): boolean => {
	const host = osPlatform();
	if (platform === "native") return true;
	if (platform === "macos") return host === "darwin";
	if (platform === "windows") return host === "win32";
	if (platform === "linux") return host === "linux";
	return false;
};

const nativePlatform = (): DefussTauriPlatform => {
	const host = osPlatform();
	if (host === "darwin") return "macos";
	if (host === "win32") return "windows";
	if (host === "linux") return "linux";
	return "native";
};

const PLATFORM_TO_HOST: Record<DefussTauriPlatform, string | null> = {
	native: null,
	macos: "darwin",
	windows: "win32",
	linux: "linux",
};

const TARGET_TRIPLES: Record<string, Record<string, string>> = {
	darwin: { arm64: "aarch64-apple-darwin", x64: "x86_64-apple-darwin" },
	linux: { arm64: "aarch64-unknown-linux-gnu", x64: "x86_64-unknown-linux-gnu" },
	win32: { arm64: "aarch64-pc-windows-msvc", x64: "x86_64-pc-windows-msvc" },
};

const targetTripleFromPlatform = (platform: DefussTauriPlatform, explicitTarget?: string): string => {
	if (explicitTarget) return explicitTarget;

	const host = PLATFORM_TO_HOST[platform] ?? osPlatform();
	const cpu = arch();
	const triple = TARGET_TRIPLES[host]?.[cpu];
	if (!triple) {
		throw new Error(`Unsupported host platform/architecture for Node sidecar: ${host}/${cpu}`);
	}
	return triple;
};

const defaultTargetTriple = (): string | undefined => {
	try {
		return targetTripleFromPlatform("native");
	} catch {
		return undefined;
	}
};

const validatePlatform = (requested: DefussTauriPlatform, explicitTarget?: string): string | undefined => {
	if (requested !== "native" && !platformMatchesHost(requested) && !explicitTarget) {
		throw new Error(
			`--platform ${requested} does not match this host (${osPlatform()}). Tauri builds are host/toolchain-specific; pass --target <rust-triple> if you intentionally prepared cross-build tooling.`,
		);
	}
	return explicitTarget;
};

const nodePlatformFromTriple = (targetTriple: string): "darwin" | "linux" | "win" => {
	if (targetTriple.includes("apple-darwin")) return "darwin";
	if (targetTriple.includes("windows")) return "win";
	if (targetTriple.includes("linux")) return "linux";
	throw new Error(`Unsupported Node target triple: ${targetTriple}`);
};

const nodeArchFromTriple = (targetTriple: string): "x64" | "arm64" => {
	if (targetTriple.startsWith("aarch64") || targetTriple.startsWith("arm64")) return "arm64";
	if (targetTriple.startsWith("x86_64")) return "x64";
	throw new Error(`Unsupported Node target architecture in triple: ${targetTriple}`);
};

const sidecarExtension = (targetTriple: string): string => targetTriple.includes("windows") ? ".exe" : "";

export const createPreparedTauriProject = async (
	options: DefussTauriOptions,
	mode: "dev" | "build" = "build",
): Promise<PreparedTauriProject> => {
	const projectDir = resolveProjectDir(options.projectDir);
	assertDirectory(projectDir, "Project directory");

	const packageJson = await maybeReadPackageJson(projectDir);
	const rawName = String(options.appName || packageJson.name || basename(projectDir) || "defuss-app");
	const productName = sanitizeProductName(rawName);
	const identifier = options.identifier || sanitizeIdentifier(rawName);
	const version = options.version || String(packageJson.version || "0.1.0");
	const managedDir = join(projectDir, options.managedDirName || DEFAULT_MANAGED_DIR);
	const srcTauriDir = join(managedDir, "src-tauri");
	const frontendDist = join(srcTauriDir, "frontend-dist");
	const appStageDir = join(srcTauriDir, "resources", "app");
	const nodeResourcesDir = join(srcTauriDir, "resources", "node");
	const nodeCacheDir = join(managedDir, "cache", "node");
	const outDir = mode === "dev"
		? (options.tauriOutDevDir || DEFAULT_TAURI_OUT_DEV)
		: (options.tauriOutDir || DEFAULT_TAURI_OUT);
	const distributionDir = join(projectDir, outDir);
	const tauriBundleDir = join(srcTauriDir, "target", "release", "bundle");
	const host = options.host || DEFAULT_HOST;
	const requestedPort = options.port || DEFAULT_PORT;
	const port = await findFreePort(requestedPort);
	if (port !== requestedPort) {
		console.log(`[defuss-tauri] port ${requestedPort} in use, using ${port} instead`);
	}
	const devUrl = `http://${host}:${port}`;
	const targetTriple = targetTripleFromPlatform(options.platform || "native", options.target);
	const nodeSidecarBase = join(srcTauriDir, "binaries", SIDECAR_NAME);
	const nodeSidecarPath = `${nodeSidecarBase}-${targetTriple}${sidecarExtension(targetTriple)}`;

	const prepared: PreparedTauriProject = {
		projectDir,
		managedDir,
		srcTauriDir,
		frontendDist,
		appStageDir,
		nodeResourcesDir,
		nodeSidecarBase,
		nodeSidecarPath,
		nodeCacheDir,
		tauriBundleDir,
		distributionDir,
		productName,
		identifier,
		version,
		devUrl,
		host,
		port,
		targetTriple,
	};

	await writeManagedTauriProject({
		...prepared,
		dangerouslyPermissive: options.dangerouslyPermissive ?? true,
		window: options.window,
	});

	return prepared;
};

const writeManagedTauriProject = async (input: PreparedTauriProject & {
	dangerouslyPermissive: boolean;
	window?: DefussTauriOptions["window"];
}): Promise<void> => {
	const rustName = sanitizeRustName(input.identifier);
	await mkdir(join(input.srcTauriDir, "src"), { recursive: true });
	await mkdir(join(input.srcTauriDir, "capabilities"), { recursive: true });
	await mkdir(join(input.srcTauriDir, "binaries"), { recursive: true });
	await mkdir(join(input.srcTauriDir, "icons"), { recursive: true });
	await mkdir(input.frontendDist, { recursive: true });
	await mkdir(dirname(input.appStageDir), { recursive: true });

	// Copy icon from package assets/ or project assets/
	const targetIcon = join(input.srcTauriDir, "icons", "icon.png");
	if (!existsSync(targetIcon)) {
		const packageIcon = join(__dirname, "..", "assets", "icon.png");
		const projectIcon = join(input.projectDir, "assets", "icon.png");
		const sourceIcon = existsSync(projectIcon) ? projectIcon : packageIcon;
		if (existsSync(sourceIcon)) {
			await copyFile(sourceIcon, targetIcon);
		}
	}

	await writeFile(join(input.frontendDist, "index.html"), `<!doctype html><meta charset="utf-8"><title>${escapeHtml(input.productName)}</title><body>Starting ${escapeHtml(input.productName)}…</body>\n`);

	await writeFile(join(input.managedDir, "package.json"), `${JSON.stringify({
		private: true,
		type: "module",
		name: `${rustName}-tauri-host`,
		version: input.version,
		scripts: {
			tauri: "tauri",
			"defuss:dev": `bunx defuss-ssg serve ${q(input.projectDir)}`,
		},
		devDependencies: {
			"@tauri-apps/cli": TAURI_CLI_VERSION,
		},
	}, null, 2)}\n`);

	const window = input.window || {};
	const devScript = process.platform === "win32"
		? `cmd /c "cd /d .. && bunx defuss-ssg dev . --port ${input.port}"`
		: `cd .. && bunx defuss-ssg dev . --port ${input.port}`;
	const frontendDist = relativeFrom(input.srcTauriDir, input.frontendDist);

	await writeFile(join(input.srcTauriDir, "Cargo.toml"), renderCargoToml(rustName, input.version, TAURI_RUST_VERSION, TAURI_SHELL_VERSION));
	await writeFile(join(input.srcTauriDir, "build.rs"), "fn main() { tauri_build::build() }\n");
	await writeFile(join(input.srcTauriDir, "src", "main.rs"), `fn main() { ${rustName}_lib::run() }\n`);
	await writeFile(join(input.srcTauriDir, "src", "lib.rs"), renderRustLib({
		host: input.host,
		port: String(input.port),
		title: window.title || input.productName,
		width: Number(window.width || DEFAULT_WINDOW_WIDTH),
		height: Number(window.height || DEFAULT_WINDOW_HEIGHT),
		resizable: window.resizable ?? true,
		fullscreen: window.fullscreen ?? false,
		sidecarName: SIDECAR_NAME,
		tcpTimeoutSecs: DEFAULT_TCP_TIMEOUT_SECS,
		tcpPollIntervalMs: DEFAULT_TCP_POLL_INTERVAL_MS,
		gracefulShutdownMs: DEFAULT_GRACEFUL_SHUTDOWN_MS,
	}));
	await writeFile(join(input.srcTauriDir, "tauri.conf.json"), renderTauriConfig({
		productName: input.productName,
		version: input.version,
		identifier: input.identifier,
		beforeDevCommand: devScript,
		devUrl: input.devUrl,
		frontendDist,
		dangerouslyPermissive: input.dangerouslyPermissive,
	}));
	await writeFile(join(input.srcTauriDir, "capabilities", "default.json"), renderCapability());
	await writeFile(join(input.srcTauriDir, "Entitlements.plist"), renderMacEntitlements(input.dangerouslyPermissive));
	await writeFile(join(input.srcTauriDir, "Info.plist"), renderMacInfoPlist(input.dangerouslyPermissive));
	await writeFile(join(input.managedDir, "README.md"), renderManagedReadme({
		tauriConfigPath: relative(input.managedDir, join(input.srcTauriDir, "tauri.conf.json")),
		appStagePath: relative(input.managedDir, input.appStageDir),
		nodeSidecarPath: relative(input.managedDir, input.nodeSidecarPath),
		nodeResourcesPath: relative(input.managedDir, input.nodeResourcesDir),
		identifier: input.identifier,
		devUrl: input.devUrl,
	}));
};

const escapeHtml = (value: string): string => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char] || char));

interface RunCommandOptions {
	cwd: string;
	debug?: boolean;
	dryRun?: boolean;
	env?: Record<string, string>;
	inherit?: boolean;
	rustToolchain?: boolean;
}

const formatCommand = (command: string, args: string[]): string => [command, ...args].map((part) => /\s/.test(part) ? q(part) : part).join(" ");

const runCommand = async (
	command: string,
	args: string[],
	options: RunCommandOptions,
): Promise<void> => {
	if (options.debug || options.dryRun) {
		console.log(`[defuss-tauri] ${options.cwd}$ ${formatCommand(command, args)}`);
	}
	if (options.dryRun) return;

	const env = { ...process.env, ...(options.env || {}) };

	// Ensure Rust toolchain is in PATH when spawning cargo-dependent commands
	if (options.rustToolchain) {
		const rustEnv = getRustEnvironment();
		Object.assign(env, rustEnv);
	}

	await new Promise<void>((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			stdio: options.inherit === false ? "pipe" : "inherit",
			env,
			shell: process.platform === "win32",
		});

		child.on("error", rejectPromise);
		child.on("exit", (code: number | null, signal: string | null) => {
			if (code === 0) resolvePromise();
			else rejectPromise(new Error(`${formatCommand(command, args)} failed with ${signal || `exit code ${code}`}`));
		});
	});
};

const getUrlText = (url: string): Promise<string> =>
	new Promise((resolvePromise, rejectPromise) => {
		const getter = url.startsWith("https:") ? httpsGet : httpGet;
		const req = getter(url, (res: any) => {
			if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				resolvePromise(getUrlText(new URL(res.headers.location, url).toString()) as any);
				res.resume?.();
				return;
			}
			if (res.statusCode !== 200) {
				res.resume?.();
				rejectPromise(new Error(`GET ${url} failed with HTTP ${res.statusCode}`));
				return;
			}
			let data = "";
			res.setEncoding?.("utf8");
			res.on?.("data", (chunk: string) => { data += chunk; });
			res.on?.("end", () => resolvePromise(data));
		});
		req.on?.("error", rejectPromise);
	});

const downloadFile = async (url: string, dest: string, options: DefussTauriOptions): Promise<void> => {
	if (options.debug || options.dryRun) console.log(`[defuss-tauri] download ${url} -> ${dest}`);
	if (options.dryRun) return;
	await mkdir(dirname(dest), { recursive: true });
	await new Promise<void>((resolvePromise, rejectPromise) => {
		const getter = url.startsWith("https:") ? httpsGet : httpGet;
		const req = getter(url, async (res: any) => {
			try {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					await downloadFile(new URL(res.headers.location, url).toString(), dest, options);
					res.resume?.();
					resolvePromise();
					return;
				}
				if (res.statusCode !== 200) {
					res.resume?.();
					rejectPromise(new Error(`GET ${url} failed with HTTP ${res.statusCode}`));
					return;
				}
				await pipeline(res, createWriteStream(dest));
				resolvePromise();
			} catch (error) {
				rejectPromise(error);
			}
		});
		req.on?.("error", rejectPromise);
	});
};

const normalizeNodeVersion = async (spec: string, baseUrl: string): Promise<string> => {
	const trimmed = spec.trim();
	if (/^v?\d+\.\d+\.\d+$/.test(trimmed)) return trimmed.replace(/^v/, "");

	if (trimmed.startsWith("latest")) {
		const shasumsUrl = `${baseUrl.replace(/\/$/, "")}/${trimmed}/SHASUMS256.txt`;
		const shasums = await getUrlText(shasumsUrl);
		const match = shasums.match(/node-v(\d+\.\d+\.\d+)-/);
		if (!match) throw new Error(`Could not resolve Node version from ${shasumsUrl}`);
		return match[1];
	}

	throw new Error(`Unsupported --node-version value: ${spec}. Use latest-v22.x or an exact version like 22.22.3.`);
};

const nodeArchiveName = (version: string, targetTriple: string): string => {
	const platform = nodePlatformFromTriple(targetTriple);
	const cpu = nodeArchFromTriple(targetTriple);
	if (platform === "win") return `node-v${version}-win-${cpu}.zip`;
	if (platform === "darwin") return `node-v${version}-darwin-${cpu}.tar.gz`;
	return `node-v${version}-linux-${cpu}.tar.xz`;
};

const archiveRootName = (archive: string): string => archive
	.replace(/\.tar\.gz$/, "")
	.replace(/\.tar\.xz$/, "")
	.replace(/\.zip$/, "");

const extractArchive = async (archivePath: string, destDir: string, options: DefussTauriOptions): Promise<void> => {
	await rm(destDir, { recursive: true, force: true });
	await mkdir(destDir, { recursive: true });
	if (archivePath.endsWith(".zip")) {
		if (process.platform === "win32") {
			await runCommand("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath ${q(archivePath)} -DestinationPath ${q(destDir)} -Force`], { cwd: destDir, debug: options.debug, dryRun: options.dryRun });
		} else {
			await runCommand("unzip", ["-q", archivePath, "-d", destDir], { cwd: destDir, debug: options.debug, dryRun: options.dryRun });
		}
		return;
	}
	const flag = archivePath.endsWith(".tar.xz") ? "-xJf" : "-xzf";
	await runCommand("tar", [flag, archivePath, "-C", destDir], { cwd: destDir, debug: options.debug, dryRun: options.dryRun });
};

const prepareNodeSidecar = async (prepared: PreparedTauriProject, options: DefussTauriOptions): Promise<void> => {
	if (options.skipNode) return;
	if (existsSync(prepared.nodeSidecarPath) && existsSync(prepared.nodeResourcesDir)) return;
	if (options.dryRun) {
		console.log(`[defuss-tauri] prepare Node sidecar for ${prepared.targetTriple}`);
		return;
	}

	const baseUrl = options.nodeDistBaseUrl || DEFAULT_NODE_DIST_BASE_URL;
	const version = await normalizeNodeVersion(options.nodeVersion || DEFAULT_NODE_VERSION, baseUrl);
	const archive = nodeArchiveName(version, prepared.targetTriple);
	const archiveUrl = `${baseUrl.replace(/\/$/, "")}/v${version}/${archive}`;
	const archivePath = join(prepared.nodeCacheDir, archive);
	const extractDir = join(prepared.nodeCacheDir, `extract-${version}-${prepared.targetTriple}`);
	const rootDir = join(extractDir, archiveRootName(archive));

	if (!existsSync(archivePath)) await downloadFile(archiveUrl, archivePath, options);
	if (!existsSync(rootDir)) await extractArchive(archivePath, extractDir, options);

	const nodeBinary = prepared.targetTriple.includes("windows") ? join(rootDir, "node.exe") : join(rootDir, "bin", "node");
	assertFile(nodeBinary, "Downloaded Node binary");

	await mkdir(dirname(prepared.nodeSidecarPath), { recursive: true });
	await copyFile(nodeBinary, prepared.nodeSidecarPath);
	await chmod(prepared.nodeSidecarPath, 0o755);
	await copyDirFresh(rootDir, prepared.nodeResourcesDir);
};

const localDefussSsgCli = (projectDir: string): string => join(projectDir, "node_modules", "defuss-ssg", "dist", "cli.mjs");

const packageManagerInstallCommand = (projectDir: string): [string, string[]] => {
	if (existsSync(join(projectDir, "bun.lock")) || existsSync(join(projectDir, "bun.lockb"))) return ["bun", ["install"]];
	if (existsSync(join(projectDir, "pnpm-lock.yaml"))) return ["pnpm", ["install"]];
	if (existsSync(join(projectDir, "yarn.lock"))) return ["yarn", ["install"]];
	return ["npm", ["install"]];
};

const ensureLocalDefussSsg = async (prepared: PreparedTauriProject, options: DefussTauriOptions): Promise<string> => {
	const cli = localDefussSsgCli(prepared.projectDir);
	if (existsSync(cli)) return cli;
	if (options.skipSsgInstall) throw new Error(`Local defuss-ssg not found: ${cli}`);

	const [installCommand, installArgs] = packageManagerInstallCommand(prepared.projectDir);
	await runCommand(installCommand, installArgs, { cwd: prepared.projectDir, debug: options.debug, dryRun: options.dryRun });
	if (existsSync(cli) || options.dryRun) return cli;

	await runCommand("bun", ["add", "-d", "defuss-ssg@latest"], { cwd: prepared.projectDir, debug: options.debug, dryRun: options.dryRun });
	if (!existsSync(cli)) throw new Error(`Could not install local defuss-ssg: ${cli}`);
	return cli;
};

const runLocalDefussSsg = async (
	prepared: PreparedTauriProject,
	options: DefussTauriOptions,
	args: string[],
): Promise<void> => {
	const cli = await ensureLocalDefussSsg(prepared, options);
	const nodeBinary = options.skipNode ? process.execPath : prepared.nodeSidecarPath;
	await runCommand(nodeBinary, [cli, ...args], {
		cwd: prepared.projectDir,
		debug: options.debug,
		dryRun: options.dryRun,
		env: {
			HOST: options.host || DEFAULT_HOST,
			PORT: String(options.port || DEFAULT_PORT),
		},
	});
};

const stageProdApp = async (prepared: PreparedTauriProject, options: DefussTauriOptions): Promise<void> => {
	if (options.dryRun) {
		console.log(`[defuss-tauri] stage ${prepared.projectDir} -> ${prepared.appStageDir}`);
		return;
	}

	const managedBase = basename(prepared.managedDir);
	const outBase = basename(prepared.distributionDir);
	const excluded = new Set([managedBase, outBase, ".git", ".hg", ".svn", "__MACOSX"]);

	const isSelfCopy = prepared.appStageDir.startsWith(prepared.projectDir + sep);

	if (isSelfCopy) {
		// fs.cp rejects copying a directory into itself before the filter runs,
		// so we need to manually handle this by creating the destination first
		// and then copying with the filter.
		await rm(prepared.appStageDir, { recursive: true, force: true });
		await mkdir(prepared.appStageDir, { recursive: true });
		await copyDirFiltered(prepared.projectDir, prepared.appStageDir, excluded, prepared);
	} else {
		await copyDirFresh(prepared.projectDir, prepared.appStageDir, {
			filter: (src: string) => {
				const rel = relative(prepared.projectDir, src);
				if (!rel) return true;
				const first = rel.split(sep)[0];
				return !excluded.has(first);
			},
		});
	}

	assertDirectory(join(prepared.appStageDir, options.ssgOutput || DEFAULT_SSG_OUTPUT), "Staged defuss-ssg dist");
	assertFile(localDefussSsgCli(prepared.appStageDir), "Staged defuss-ssg CLI");

	// Prune devDependencies from staged app to reduce bundle size
	// Remove node_modules entirely, then reinstall with --production to only get runtime deps
	const stagedNodeModules = join(prepared.appStageDir, "node_modules");
	await rm(stagedNodeModules, { recursive: true, force: true });
	await rm(join(prepared.appStageDir, "bun.lock"), { force: true });
	await rm(join(prepared.appStageDir, "bun.lockb"), { force: true });
	await runCommand("bun", ["install", "--production"], { cwd: prepared.appStageDir, debug: options.debug, dryRun: options.dryRun });

};

const copyDirFiltered = async (
	src: string,
	dest: string,
	excluded: Set<string>,
	prepared: PreparedTauriProject,
): Promise<void> => {
	const entries = await readdir(src, { withFileTypes: true });

	for (const entry of entries) {
		const relName = entry.name;
		if (excluded.has(relName)) continue;

		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);

		// Skip if destination is inside the source (self-copy protection)
		if (srcPath.startsWith(prepared.appStageDir + sep) || srcPath === prepared.appStageDir) continue;

		// entry uses lstat, so symlinks report isDirectory()=false and isFile()=false.
		// Follow symlinks with statSync to determine the real target type.
		const isSymlink = entry.isSymbolicLink();
		const realStat = isSymlink ? statSync(srcPath) : null;
		const isDir = entry.isDirectory() || (realStat?.isDirectory() ?? false);
		const isRegular = entry.isFile() || (realStat?.isFile() ?? false);

		if (isDir) {
			await mkdir(destPath, { recursive: true });
			await copyDirFiltered(srcPath, destPath, excluded, prepared);
		} else if (isRegular) {
			await mkdir(dirname(destPath), { recursive: true });
			await copyFile(srcPath, destPath);
		}
		// Skip sockets, device files, and other special types
	}
};

const ensureManagedInstall = async (prepared: PreparedTauriProject, options: DefussTauriOptions): Promise<void> => {
	if (options.skipInstall) return;
	const tauriBin = process.platform === "win32"
		? join(prepared.managedDir, "node_modules", ".bin", "tauri.cmd")
		: join(prepared.managedDir, "node_modules", ".bin", "tauri");
	if (existsSync(tauriBin)) return;
	await runCommand("bun", ["install"], { cwd: prepared.managedDir, debug: options.debug, dryRun: options.dryRun });
};

const runTauri = async (
	subcommand: "dev" | "build",
	prepared: PreparedTauriProject,
	options: DefussTauriOptions,
): Promise<void> => {
	await ensureManagedInstall(prepared, options);
	const args = ["run", "tauri", subcommand];
	const explicitTarget = validatePlatform(options.platform || "native", options.target);
	if (subcommand === "build" && explicitTarget) args.push("--", "--target", explicitTarget);

	const env: Record<string, string> = {
		DEFUSS_TAURI_HOST: options.host || DEFAULT_HOST,
		DEFUSS_TAURI_PORT: String(options.port || DEFAULT_PORT),
	};
	if (subcommand === "dev") {
		env.DEFUSS_TAURI_APP_DIR = prepared.projectDir;
		env.DEFUSS_TAURI_SSG_MODE = "dev";
	}

	await runCommand("bun", args, { cwd: prepared.managedDir, debug: options.debug, dryRun: options.dryRun, env, rustToolchain: true });
};

const getRustEnvironment = (): Record<string, string> => {
	const home = homedir();
	const cargoBin = join(home, ".cargo", "bin");
	const cargoHome = join(home, ".cargo");
	const rustupHome = join(home, ".rustup");

	const result: Record<string, string> = {};

	// Set CARGO_HOME and RUSTUP_HOME if they're not already set
	if (!process.env.CARGO_HOME && existsSync(cargoHome)) {
		result.CARGO_HOME = cargoHome;
	}
	if (!process.env.RUSTUP_HOME && existsSync(rustupHome)) {
		result.RUSTUP_HOME = rustupHome;
	}

	// Ensure ~/.cargo/bin is in PATH
	if (existsSync(cargoBin)) {
		const currentPath = process.env.PATH || "";
		if (!currentPath.includes(cargoBin)) {
			result.PATH = `${cargoBin}${sep}${currentPath}`;
		}
	}

	return result;
};

const checkRustToolchain = (): void => {
	const rustEnv = getRustEnvironment();
	const env = { ...process.env, ...rustEnv };
	const cargoBin = join(homedir(), ".cargo", "bin");
	const cargoPath = join(cargoBin, "cargo");
	const rustcPath = join(cargoBin, "rustc");

	// Check if cargo is available in PATH or ~/.cargo/bin
	const cargoInPath = (env.PATH || "").split(sep).some((p: string) => existsSync(join(p, "cargo")));
	const cargoInHome = existsSync(cargoPath);

	if (!cargoInPath && !cargoInHome) {
		throw new Error(
			"Rust toolchain (cargo) is not installed. Install it via https://rustup.rs/ or your package manager, then retry.",
		);
	}

	// Use full path to cargo for verification (avoids shell PATH resolution issues)
	const cargoCmd = cargoInHome ? cargoPath : "cargo";
	const rustcCmd = existsSync(rustcPath) ? rustcPath : "rustc";

	try {
		execSync(`${cargoCmd} --version`, { env, stdio: "pipe"/*, shell: true */ });
	} catch (e: any) {
		const stderr = e.stderr?.toString() || "";
		if (stderr.includes("could not choose a version")) {
			throw new Error(
				`Rust is installed but no default toolchain is configured. Run 'rustup default stable' to set the default toolchain.`,
			);
		}
		if (cargoInHome) {
			throw new Error(
				`Rust is installed at ${cargoBin} but ~/.cargo/bin is not in your PATH. Add 'export PATH="${cargoBin}:$PATH"' to your shell profile (~/.zshrc, ~/.bashrc, etc.) or run 'source ~/.cargo/env'.`,
			);
		}
		throw new Error(
			"cargo is in PATH but failed to execute. Your Rust installation may be corrupted. Try running 'rustup self update'.",
		);
	}

	// Verify rustc works too
	try {
		execSync(`${rustcCmd} --version`, { env, stdio: "pipe"/*, shell: true */ });
	} catch {
		throw new Error(
			"rustc is not available. Run 'rustup install stable' to set up the Rust compiler.",
		);
	}
};

const copyResourcesToBundle = async (prepared: PreparedTauriProject, options: DefussTauriOptions): Promise<void> => {
	console.log("[defuss-tauri] copyResourcesToBundle() entered");
	if (options.dryRun) {
		console.log("[defuss-tauri] copyResourcesToBundle() skipping (dryRun)");
		return;
	}
	// Find the .app bundle and copy resources directly into it (bypasses Tauri bundler)
	const appBundle = prepared.targetTriple.includes("darwin")
		? join(prepared.tauriBundleDir, "macOS", `${prepared.productName}.app`)
		: null;
	if (!appBundle) {
		console.log("[defuss-tauri] copyResourcesToBundle() skipping (not darwin)");
		return;
	}
	console.log(`[defuss-tauri] copyResourcesToBundle() looking for .app at: ${appBundle}`);
	if (!existsSync(appBundle)) {
		console.log("[defuss-tauri] copyResourcesToBundle() .app bundle does not exist!");
		return;
	}
	const appSize = statSync(appBundle).size;
	console.log(`[defuss-tauri] copyResourcesToBundle() .app found (${(appSize / 1024 / 1024).toFixed(1)} MB)`);

	const resourcesDir = join(appBundle, "Contents", "Resources", "resources");
	console.log(`[defuss-tauri] copyResourcesToBundle() creating resources dir: ${resourcesDir}`);
	await mkdir(resourcesDir, { recursive: true });

	// Copy app resources
	if (existsSync(prepared.appStageDir)) {
		const appStageSize = statSync(prepared.appStageDir).size;
		console.log(`[defuss-tauri] copyResourcesToBundle() copying app resources (${(appStageSize / 1024 / 1024).toFixed(1)} MB) from ${prepared.appStageDir}`);
		await copyDirFresh(prepared.appStageDir, join(resourcesDir, "app"));
		console.log("[defuss-tauri] copyResourcesToBundle() app resources copied");
	} else {
		console.log("[defuss-tauri] copyResourcesToBundle() skipping app resources (dir not found)");
	}

	// Copy node resources
	if (existsSync(prepared.nodeResourcesDir)) {
		const nodeSize = statSync(prepared.nodeResourcesDir).size;
		console.log(`[defuss-tauri] copyResourcesToBundle() copying node resources (${(nodeSize / 1024 / 1024).toFixed(1)} MB) from ${prepared.nodeResourcesDir}`);
		await copyDirFresh(prepared.nodeResourcesDir, join(resourcesDir, "node"));
		console.log("[defuss-tauri] copyResourcesToBundle() node resources copied");
	} else {
		console.log("[defuss-tauri] copyResourcesToBundle() skipping node resources (dir not found)");
	}

	console.log("[defuss-tauri] copyResourcesToBundle() resources copied, now rebuilding DMG...");
	// Rebuild the DMG to include the updated .app with resources
	await rebuildDmg(prepared, options);
	console.log("[defuss-tauri] copyResourcesToBundle() complete");
};

/**
 * Rebuild the macOS DMG after resources are copied into the .app bundle,
 * since Tauri creates the DMG before we add resources.
 * Creates a proper DMG with .app + symlink to /Applications matching Tauri conventions.
 */
const rebuildDmg = async (prepared: PreparedTauriProject, options: DefussTauriOptions): Promise<void> => {
	console.log("[defuss-tauri] rebuildDmg() entered");
	const appBundle = join(prepared.tauriBundleDir, "macOS", `${prepared.productName}.app`);
	const dmgDir = join(prepared.tauriBundleDir, "dmg");
	const dmgName = `${prepared.productName}_${prepared.version}_${prepared.targetTriple.split("-")[0]}.dmg`;
	const dmgPath = join(dmgDir, dmgName);

	console.log(`[defuss-tauri] rebuildDmg() target DMG: ${dmgPath}`);
	console.log(`[defuss-tauri] rebuildDmg() .app bundle: ${appBundle}`);

	console.log(`[defuss-tauri] rebuildDmg() removing old DMG: ${dmgPath}`);
	await rm(dmgPath, { force: true });
	console.log(`[defuss-tauri] rebuildDmg() creating dmg dir: ${dmgDir}`);
	await mkdir(dmgDir, { recursive: true });

	// Create a staging directory with the .app and a symlink to /Applications
	const stagingDir = join(dmgDir, ".dmg-staging");
	console.log(`[defuss-tauri] rebuildDmg() cleaning staging dir: ${stagingDir}`);
	await rm(stagingDir, { recursive: true, force: true });
	console.log(`[defuss-tauri] rebuildDmg() creating staging dir: ${stagingDir}`);
	await mkdir(stagingDir, { recursive: true });

	const stagingAppPath = join(stagingDir, basename(appBundle));
	console.log(`[defuss-tauri] rebuildDmg() copying .app to staging (this may take a while for large bundles)...`);
	console.log(`[defuss-tauri] rebuildDmg()   from: ${appBundle}`);
	console.log(`[defuss-tauri] rebuildDmg()   to: ${stagingAppPath}`);
	// Use fs.cp instead of shell cp to handle paths with spaces
	await cp(appBundle, stagingAppPath, { recursive: true, force: true, dereference: true });
	console.log("[defuss-tauri] rebuildDmg() .app copied to staging");

	const symlinkPath = join(stagingDir, "Applications");
	console.log(`[defuss-tauri] rebuildDmg() creating symlink: ${symlinkPath} -> /Applications`);
	await runCommand("ln", ["-s", "/Applications", symlinkPath], {
		cwd: stagingDir,
		debug: options.debug,
		dryRun: options.dryRun,
	});
	console.log("[defuss-tauri] rebuildDmg() symlink created");

	// Create compressed DMG from staging directory
	const tmpDmg = join(dmgDir, ".dmg-tmp.dmg");
	console.log(`[defuss-tauri] rebuildDmg() creating compressed DMG via hdiutil...`);
	console.log(`[defuss-tauri] rebuildDmg()   tmpDmg: ${tmpDmg}`);
	console.log(`[defuss-tauri] rebuildDmg()   volname: ${prepared.productName}`);
	console.log(`[defuss-tauri] rebuildDmg()   srcfolder: ${stagingDir}`);
	console.log(`[defuss-tauri] rebuildDmg()   this may take 1-5 minutes for large bundles`);
	await runCommand("hdiutil", ["create", "-volname", prepared.productName, "-srcfolder", stagingDir, "-ov", "-format", "UDZO", tmpDmg], {
		cwd: dmgDir,
		debug: options.debug,
		dryRun: options.dryRun,
	});
	console.log("[defuss-tauri] rebuildDmg() hdiutil create complete");

	console.log(`[defuss-tauri] rebuildDmg() renaming ${tmpDmg} -> ${dmgPath}`);
	// Use fs.rename instead of shell mv to handle paths with spaces
	await rename(tmpDmg, dmgPath);
	console.log("[defuss-tauri] rebuildDmg() DMG renamed");

	// Clean up staging
	console.log(`[defuss-tauri] rebuildDmg() cleaning up staging dir: ${stagingDir}`);
	await rm(stagingDir, { recursive: true, force: true });
	console.log("[defuss-tauri] rebuildDmg() complete");

	// Report final DMG size
	if (existsSync(dmgPath)) {
		const finalSize = statSync(dmgPath).size;
		console.log(`[defuss-tauri] rebuildDmg() final DMG size: ${(finalSize / 1024 / 1024).toFixed(1)} MB`);
	}
};

const collectBundles = async (prepared: PreparedTauriProject, options: DefussTauriOptions): Promise<void> => {
	if (options.dryRun) return;
	if (!existsSync(prepared.tauriBundleDir)) {
		if (options.debug) console.warn(`[defuss-tauri] bundle dir not found: ${prepared.tauriBundleDir}`);
		return;
	}
	await copyDirFresh(prepared.tauriBundleDir, prepared.distributionDir);
};

export const initDefussTauri = async (options: DefussTauriOptions): Promise<RunResult> => {
	checkRustToolchain();
	const prepared = await createPreparedTauriProject(options);
	await prepareNodeSidecar(prepared, options);
	return { code: "OK", message: `Prepared defuss-tauri host in ${prepared.managedDir}`, prepared };
};

export const buildDefussTauri = async (options: DefussTauriOptions): Promise<RunResult> => {
	console.log("[defuss-tauri] starting build...");
	checkRustToolchain();
	const start = performance.now();
	const projectDir = resolveProjectDir(options.projectDir);
	const distributionDir = join(projectDir, options.tauriOutDir || DEFAULT_TAURI_OUT);
	// Clean distribution dir; managed files are overwritten by writeManagedTauriProject
	console.log(`[defuss-tauri] cleaning distribution dir: ${distributionDir}`);
	await rm(distributionDir, { recursive: true, force: true });
	console.log("[defuss-tauri] creating prepared Tauri project...");
	const prepared = await createPreparedTauriProject(options);
	console.log("[defuss-tauri] preparing Node sidecar...");
	await prepareNodeSidecar(prepared, options);

	if (!options.skipSsg) {
		console.log("[defuss-tauri] running defuss-ssg build...");
		await runLocalDefussSsg(prepared, options, ["build", "."]);
		console.log("[defuss-tauri] defuss-ssg build complete");
	}
	console.log("[defuss-tauri] staging production app...");
	await stageProdApp(prepared, options);
	console.log("[defuss-tauri] staging complete, running Tauri build...");
	await runTauri("build", prepared, options);
	console.log("[defuss-tauri] Tauri build complete, copying resources to bundle...");
	await copyResourcesToBundle(prepared, options);
	console.log("[defuss-tauri] resources copied, collecting bundles...");
	await collectBundles(prepared, options);

	const elapsed = Math.round(performance.now() - start);
	console.log(`[defuss-tauri] build complete in ${elapsed}ms`);
	return {
		code: "OK",
		message: `Built ${prepared.productName} in ${elapsed}ms. Bundles: ${prepared.distributionDir}`,
		prepared,
	};
};

export const devDefussTauri = async (options: DefussTauriOptions): Promise<RunResult> => {
	checkRustToolchain();
	const prepared = await createPreparedTauriProject(options, "dev");
	await prepareNodeSidecar(prepared, options);
	await ensureLocalDefussSsg(prepared, options);
	await runTauri("dev", prepared, options);
	return { code: "OK", message: `Stopped dev host for ${prepared.productName}`, prepared };
};

export const doctorDefussTauri = async (options: DefussTauriOptions): Promise<RunResult> => {
	const prepared = await createPreparedTauriProject(options);
	const checks: Array<[string, string[]]> = [
		["bun", ["--version"]],
		["cargo", ["--version"]],
		["rustc", ["--version"]],
	];
	for (const [command, args] of checks) {
		try {
			await runCommand(command, args, { cwd: resolveProjectDir(options.projectDir), debug: true, inherit: true, dryRun: options.dryRun });
		} catch (error) {
			throw new Error(`Missing or broken dependency: ${command}. ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (!options.skipNode) await prepareNodeSidecar(prepared, options);
	return { code: "OK", message: "defuss-tauri toolchain and Node sidecar look available.", prepared };
};

export const runDefussTauri = async (options: DefussTauriOptions): Promise<RunResult> => {
	const command = options.command || "dev";
	const normalized: DefussTauriOptions = {
		...options,
		command,
		projectDir: resolveProjectDir(options.projectDir),
		platform: options.platform || "native",
		host: options.host || DEFAULT_HOST,
		port: options.port || DEFAULT_PORT,
		ssgOutput: options.ssgOutput || DEFAULT_SSG_OUTPUT,
		managedDirName: options.managedDirName || DEFAULT_MANAGED_DIR,
		tauriOutDir: options.tauriOutDir || DEFAULT_TAURI_OUT,
		nodeVersion: options.nodeVersion || DEFAULT_NODE_VERSION,
		nodeDistBaseUrl: options.nodeDistBaseUrl || DEFAULT_NODE_DIST_BASE_URL,
		dangerouslyPermissive: options.dangerouslyPermissive ?? true,
	};

	if (normalized.platform && normalized.platform !== "native") validatePlatform(normalized.platform, normalized.target);
	if (command === "init") return initDefussTauri(normalized);
	if (command === "build") return buildDefussTauri(normalized);
	if (command === "dev") return devDefussTauri(normalized);
	if (command === "doctor") return doctorDefussTauri(normalized);
	throw new Error(`Unknown defuss-tauri command: ${command}`);
};

export const defaults = {
	port: DEFAULT_PORT,
	host: DEFAULT_HOST,
	managedDirName: DEFAULT_MANAGED_DIR,
	ssgOutput: DEFAULT_SSG_OUTPUT,
	tauriOutDir: DEFAULT_TAURI_OUT,
	nodeVersion: DEFAULT_NODE_VERSION,
	nodeDistBaseUrl: DEFAULT_NODE_DIST_BASE_URL,
	tauriCliVersion: TAURI_CLI_VERSION,
	nativePlatform: nativePlatform(),
	defaultTargetTriple: defaultTargetTriple(),
	isTruthy,
};
