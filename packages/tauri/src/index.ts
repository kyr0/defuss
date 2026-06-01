import { execSync, spawn } from "node:child_process";
import { createWriteStream, existsSync, statSync } from "node:fs";
import { chmod, copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_MANAGED_DIR = ".defuss-tauri";
const DEFAULT_SSG_OUTPUT = "dist";
const DEFAULT_TAURI_OUT = "dist-tauri";
const DEFAULT_NODE_VERSION = "latest-v22.x";
const DEFAULT_NODE_DIST_BASE_URL = "https://nodejs.org/download/release";
const TAURI_CLI_VERSION = "^2.8.0";
const TAURI_RUST_VERSION = "2";
const TAURI_SHELL_VERSION = "2";
const SIDECAR_NAME = "node";

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
  // when the Node.js distribution contains symlinks (e.g. bin/corepack, bin/npx, bin/npm)
  await cp(src, dest, { recursive: true, force: true, dereference: true, ...(options || {}) });
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

const targetTripleFromPlatform = (platform: DefussTauriPlatform, explicitTarget?: string): string => {
  if (explicitTarget) return explicitTarget;

  const host = platform === "native" ? osPlatform() : platform === "macos" ? "darwin" : platform === "windows" ? "win32" : "linux";
  const cpu = arch();

  if (host === "darwin" && cpu === "arm64") return "aarch64-apple-darwin";
  if (host === "darwin") return "x86_64-apple-darwin";
  if (host === "linux" && cpu === "arm64") return "aarch64-unknown-linux-gnu";
  if (host === "linux") return "x86_64-unknown-linux-gnu";
  if (host === "win32" && cpu === "arm64") return "aarch64-pc-windows-msvc";
  if (host === "win32") return "x86_64-pc-windows-msvc";

  throw new Error(`Unsupported host platform/architecture for Node sidecar: ${host}/${cpu}`);
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
  const distributionDir = join(projectDir, options.tauriOutDir || DEFAULT_TAURI_OUT);
  const tauriBundleDir = join(srcTauriDir, "target", "release", "bundle");
  const host = options.host || DEFAULT_HOST;
  const port = options.port || DEFAULT_PORT;
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

  await writeFile(join(input.srcTauriDir, "Cargo.toml"), renderCargoToml(rustName, input.version));
  await writeFile(join(input.srcTauriDir, "build.rs"), "fn main() { tauri_build::build() }\n");
  await writeFile(join(input.srcTauriDir, "src", "main.rs"), `fn main() { ${rustName}_lib::run() }\n`);
  await writeFile(join(input.srcTauriDir, "src", "lib.rs"), renderRustLib(input));
  await writeFile(join(input.srcTauriDir, "tauri.conf.json"), renderTauriConfig(input));
  await writeFile(join(input.srcTauriDir, "capabilities", "default.json"), renderCapability());
  await writeFile(join(input.srcTauriDir, "Entitlements.plist"), renderMacEntitlements(input.dangerouslyPermissive));
  await writeFile(join(input.srcTauriDir, "Info.plist"), renderMacInfoPlist(input.dangerouslyPermissive));
  await writeFile(join(input.managedDir, "README.md"), renderManagedReadme(input));
};

const escapeHtml = (value: string): string => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char] || char));

const renderCargoToml = (rustName: string, version: string): string => `[package]\nname = ${q(rustName)}\nversion = ${q(version)}\nedition = "2021"\n\n[lib]\nname = ${q(`${rustName}_lib`)}\ncrate-type = ["staticlib", "cdylib", "rlib"]\n\n[build-dependencies]\ntauri-build = { version = ${q(TAURI_RUST_VERSION)}, features = [] }\n\n[dependencies]\ntauri = { version = ${q(TAURI_RUST_VERSION)}, features = [] }\ntauri-plugin-shell = ${q(TAURI_SHELL_VERSION)}\n`;

const renderRustLib = (input: PreparedTauriProject & {
  window?: DefussTauriOptions["window"];
}): string => {
  const window = input.window || {};
  return `use std::net::TcpStream;\nuse std::sync::Mutex;\nuse std::thread;\nuse std::time::{Duration, Instant};\n\nuse tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};\nuse tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};\n\nconst DEFAULT_HOST: &str = ${q(input.host)};\nconst DEFAULT_PORT: &str = ${q(String(input.port))};\nconst DEFAULT_TITLE: &str = ${q(window.title || input.productName)};\nconst DEFAULT_WIDTH: f64 = ${Number(window.width || 1280)}.0;\nconst DEFAULT_HEIGHT: f64 = ${Number(window.height || 800)}.0;\nconst DEFAULT_RESIZABLE: bool = ${window.resizable ?? true};\nconst DEFAULT_FULLSCREEN: bool = ${window.fullscreen ?? false};\n\nstruct DefussSidecarState(Mutex<Option<CommandChild>>);\n\nfn wait_for_tcp(host: &str, port: &str, timeout: Duration) -> Result<(), String> {\n    let started = Instant::now();\n    let addr = format!("{}:{}", host, port);\n\n    while started.elapsed() < timeout {\n        if TcpStream::connect(&addr).is_ok() {\n            return Ok(());\n        }\n        thread::sleep(Duration::from_millis(150));\n    }\n\n    Err(format!("timed out waiting for defuss-ssg at http://{}", addr))\n}\n\nfn is_dev_mode() -> bool {\n    // DEFUSS_TAURI_APP_DIR is set during tauri dev; in production it's absent.\n    std::env::var("DEFUSS_TAURI_APP_DIR").is_ok()\n}\n\nfn start_defuss_server(app: &mut tauri::App) -> Result<String, Box<dyn std::error::Error>> {\n    let handle = app.handle().clone();\n    let host = std::env::var("DEFUSS_TAURI_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());\n    let port = std::env::var("DEFUSS_TAURI_PORT").unwrap_or_else(|_| DEFAULT_PORT.to_string());\n\n    let resource_dir = app.path().resource_dir()?;\n    let app_dir = resource_dir.join("resources").join("app");\n\n    let cli = app_dir\n        .join("node_modules")\n        .join("defuss-ssg")\n        .join("dist")\n        .join("cli.mjs");\n\n    if !cli.exists() {\n        return Err(format!("defuss-ssg CLI not found: {}", cli.display()).into());\n    }\n\n    println!("[defuss-tauri] starting defuss-ssg serve in {}", app_dir.display());\n\n    let (mut rx, child) = handle\n        .shell()\n        .sidecar("${SIDECAR_NAME}")?\n        .args([cli.to_string_lossy().to_string(), "serve".to_string(), ".".to_string()])\n        .current_dir(&app_dir)\n        .env("HOST", &host)\n        .env("PORT", &port)\n        .env("NODE_ENV", "production")\n        .spawn()?;\n\n    *app.state::<DefussSidecarState>().0.lock().unwrap() = Some(child);\n\n    tauri::async_runtime::spawn(async move {\n        while let Some(event) = rx.recv().await {\n            match event {\n                CommandEvent::Stdout(bytes) => print!("{}", String::from_utf8_lossy(&bytes)),\n                CommandEvent::Stderr(bytes) => eprint!("{}", String::from_utf8_lossy(&bytes)),\n                CommandEvent::Error(message) => eprintln!("[defuss-tauri] sidecar error: {}", message),\n                CommandEvent::Terminated(payload) => eprintln!("[defuss-tauri] sidecar terminated: {:?}", payload),\n                _ => {}\n            }\n        }\n    });\n\n    wait_for_tcp(&host, &port, Duration::from_secs(45))?;\n    Ok(format!("http://{}:{}", host, port))\n}\n\n#[cfg_attr(mobile, tauri::mobile_entry_point)]\npub fn run() {\n    tauri::Builder::default()\n        .plugin(tauri_plugin_shell::init())\n        .manage(DefussSidecarState(Mutex::new(None)))\n        .setup(|app| {\n            let url = if is_dev_mode() {\n                // In dev mode, beforeDevCommand handles starting the server.\n                let host = std::env::var("DEFUSS_TAURI_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());\n                let port = std::env::var("DEFUSS_TAURI_PORT").unwrap_or_else(|_| DEFAULT_PORT.to_string());\n                format!("http://{}:{}", host, port)\n            } else {\n                start_defuss_server(app)?\n            };\n            WebviewWindowBuilder::new(app.handle(), "main", WebviewUrl::External(url.parse()?))\n                .title(DEFAULT_TITLE)\n                .inner_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)\n                .resizable(DEFAULT_RESIZABLE)\n                .fullscreen(DEFAULT_FULLSCREEN)\n                .center()\n                .build()?;\n            Ok(())\n        })\n        .on_window_event(|window, event| {\n            if let WindowEvent::CloseRequested { .. } = event {\n                let state = window.state::<DefussSidecarState>();\n                if let Some(child) = state.0.lock().unwrap().take() {\n                    let _ = child.kill();\n                };\n            }\n        })\n        .run(tauri::generate_context!())\n        .expect("error while running defuss-tauri application");\n}\n`;
};

const renderTauriConfig = (input: PreparedTauriProject & {
  dangerouslyPermissive: boolean;
}): string => {
  const frontendDist = relativeFrom(input.srcTauriDir, input.frontendDist);
  // Tauri's beforeDevCommand runs from the managed dir, so we cd .. to reach the project dir.
  // Use "dev" command for hot reloading during development.
  const devScript = process.platform === "win32"
    ? `cmd /c "cd /d .. && bunx defuss-ssg dev . --port ${input.port}"`
    : `cd .. && bunx defuss-ssg dev . --port ${input.port}`;
  const config = {
    $schema: "https://schema.tauri.app/config/2",
    productName: input.productName,
    version: input.version,
    identifier: input.identifier,
    build: {
      beforeDevCommand: devScript,
      beforeBuildCommand: "",
      devUrl: input.devUrl,
      frontendDist,
    },
    app: {
      withGlobalTauri: true,
      security: {
        csp: input.dangerouslyPermissive ? "default-src * data: 'unsafe-inline' 'unsafe-eval'; connect-src * ipc://localhost ws://* wss://*;" : undefined,
        devCsp: input.dangerouslyPermissive ? "default-src * data: 'unsafe-inline' 'unsafe-eval'; connect-src * ipc://localhost ws://* wss://*;" : undefined,
        dangerousDisableAssetCspModification: input.dangerouslyPermissive,
        headers: input.dangerouslyPermissive ? {
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
          "Access-Control-Expose-Headers": "*",
          "Access-Control-Max-Age": "86400",
          "Timing-Allow-Origin": "*",
          "Service-Worker-Allowed": "/",
          "Permissions-Policy": "accelerometer=*, autoplay=*, bluetooth=*, camera=*, clipboard-read=*, clipboard-write=*, display-capture=*, fullscreen=*, gamepad=*, geolocation=*, gyroscope=*, hid=*, idle-detection=*, local-fonts=*, magnetometer=*, microphone=*, midi=*, payment=*, picture-in-picture=*, publickey-credentials-create=*, publickey-credentials-get=*, screen-wake-lock=*, serial=*, speaker-selection=*, usb=*, web-share=*, xr-spatial-tracking=*",
        } : undefined,
        freezePrototype: false,
        capabilities: ["default"],
      },
      windows: [],
    },
    bundle: {
      active: true,
      targets: "all",
      externalBin: ["binaries/node"],
      resources: {},
      macOS: {
        minimumSystemVersion: "12.0",
        entitlements: "./Entitlements.plist",
        infoPlist: "./Info.plist",
      },
    },
  };
  return `${JSON.stringify(config, (_key, value) => (value === undefined ? undefined : value), 2)}\n`;
};

const renderCapability = (): string => `${JSON.stringify({
  $schema: "../gen/schemas/desktop-schema.json",
  identifier: "default",
  description: "Default capability for the generated defuss-tauri main window.",
  windows: ["main"],
  permissions: [
    "core:default",
    {
      identifier: "shell:allow-spawn",
      allow: [{ name: "binaries/node", sidecar: true, args: true }],
    },
    {
      identifier: "shell:allow-execute",
      allow: [{ name: "binaries/node", sidecar: true, args: true }],
    },
  ],
}, null, 2)}\n`;

const renderMacEntitlements = (permissive: boolean): string => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>com.apple.security.network.client</key>\n  <true/>\n  <key>com.apple.security.network.server</key>\n  <true/>\n  <key>com.apple.security.device.audio-input</key>\n  <true/>\n  <key>com.apple.security.device.camera</key>\n  <true/>\n  <key>com.apple.security.personal-information.location</key>\n  <true/>\n  <key>com.apple.security.device.bluetooth</key>\n  <true/>\n  <key>com.apple.security.device.usb</key>\n  <true/>\n${permissive ? "  <key>com.apple.security.cs.allow-jit</key>\n  <true/>\n  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>\n  <true/>\n" : ""}</dict>\n</plist>\n`;

const renderMacInfoPlist = (permissive: boolean): string => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>NSCameraUsageDescription</key>\n  <string>This defuss-tauri app may access the camera when requested by the web app.</string>\n  <key>NSMicrophoneUsageDescription</key>\n  <string>This defuss-tauri app may access the microphone when requested by the web app.</string>\n  <key>NSLocationWhenInUseUsageDescription</key>\n  <string>This defuss-tauri app may access location when requested by the web app.</string>\n  <key>NSBluetoothAlwaysUsageDescription</key>\n  <string>This defuss-tauri app may access Bluetooth when requested by the web app.</string>\n  <key>NSBluetoothPeripheralUsageDescription</key>\n  <string>This defuss-tauri app may access Bluetooth peripherals when requested by the web app.</string>\n  <key>NSLocalNetworkUsageDescription</key>\n  <string>This defuss-tauri app may access local network devices during development and runtime.</string>\n  <key>NSSpeechRecognitionUsageDescription</key>\n  <string>This defuss-tauri app may access speech recognition when requested by the web app.</string>\n  <key>NSAppleEventsUsageDescription</key>\n  <string>This defuss-tauri app may send Apple Events when explicitly requested by the app.</string>\n  <key>NSAppTransportSecurity</key>\n  <dict>\n    <key>NSAllowsLocalNetworking</key>\n    <true/>\n${permissive ? "    <key>NSAllowsArbitraryLoads</key>\n    <true/>\n" : ""}  </dict>\n</dict>\n</plist>\n`;

const renderManagedReadme = (input: PreparedTauriProject): string => `# Managed defuss-tauri host\n\nThis folder is generated. Edit the source defuss app, not this folder.\n\n- Tauri config: \`${relative(input.managedDir, join(input.srcTauriDir, "tauri.conf.json"))}\`\n- Runtime app stage: \`${relative(input.managedDir, input.appStageDir)}\`\n- Node sidecar: \`${relative(input.managedDir, input.nodeSidecarPath)}\`\n- Node resources: \`${relative(input.managedDir, input.nodeResourcesDir)}\`\n- App identifier: \`${input.identifier}\`\n- Localhost URL: \`${input.devUrl}\`\n`;

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

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyDirFiltered(srcPath, destPath, excluded, prepared);
    } else {
      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(srcPath, destPath);
    }
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
  if (options.dryRun) return;
  // Find the .app bundle and copy resources directly into it (bypasses Tauri bundler)
  const appBundle = prepared.targetTriple.includes("darwin")
    ? join(prepared.tauriBundleDir, "macOS", `${prepared.productName}.app`)
    : null;
  if (appBundle && existsSync(appBundle)) {
    const resourcesDir = join(appBundle, "Contents", "Resources", "resources");
    await mkdir(resourcesDir, { recursive: true });
    // Copy app resources
    if (existsSync(prepared.appStageDir)) {
      await copyDirFresh(prepared.appStageDir, join(resourcesDir, "app"));
    }
    // Copy node resources
    if (existsSync(prepared.nodeResourcesDir)) {
      await copyDirFresh(prepared.nodeResourcesDir, join(resourcesDir, "node"));
    }
    if (options.debug) console.log(`[defuss-tauri] copied resources to ${resourcesDir}`);
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
  checkRustToolchain();
  const start = performance.now();
  const prepared = await createPreparedTauriProject(options);
  await prepareNodeSidecar(prepared, options);

  if (!options.skipSsg) await runLocalDefussSsg(prepared, options, ["build", "."]);
  await stageProdApp(prepared, options);
  await runTauri("build", prepared, options);
  await copyResourcesToBundle(prepared, options);
  await collectBundles(prepared, options);

  const elapsed = Math.round(performance.now() - start);
  return {
    code: "OK",
    message: `Built ${prepared.productName} in ${elapsed}ms. Bundles: ${prepared.distributionDir}`,
    prepared,
  };
};

export const devDefussTauri = async (options: DefussTauriOptions): Promise<RunResult> => {
  checkRustToolchain();
  const prepared = await createPreparedTauriProject(options);
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
