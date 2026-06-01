#!/usr/bin/env node
import { runDefussTauri } from "./index.js";
import type { DefussTauriCommand, DefussTauriOptions, DefussTauriPlatform } from "./types.js";

const usage = `Usage: defuss-tauri [dev|build|init|doctor] [folder] [options]

Examples:
  bunx defuss-tauri build . --platform macos
  bunx defuss-tauri dev . --platform macos
  bunx defuss-tauri init .
  bunx defuss-tauri doctor .

Defaults:
  No args           => dev .
  Single path       => dev <path>
  Single command    => <command> .
  Command + folder  => <command> <folder>

Options:
  --platform <native|macos|windows|linux>
  --target <rust-target-triple>
  --port, -p <number>              Default: 3000
  --host, -H <host>                Default: 127.0.0.1
  --app-name <name>
  --identifier <reverse.dns.id>
  --version <semver>
  --ssg-output <dir>               Default: dist
  --managed-dir <dir>              Default: .defuss-tauri
  --tauri-out <dir>                Default: dist-tauri
  --skip-ssg                       Do not call bunx defuss-ssg
  --skip-install                   Do not run bun install in the managed Tauri host
  --skip-node                      Do not download/stage bundled Node; use current process for SSG commands
  --skip-ssg-install               Do not install defuss-ssg if local package is missing
  --node-version <latest-v22.x|x.y.z> Default: latest-v22.x
  --node-dist-base-url <url>       Default: https://nodejs.org/download/release
  --strict-security                Do not emit the intentionally permissive dev/prototype settings
  --dry-run                        Print external commands; still writes generated host files
  --debug, -d
  --help, -h`;

const commands = new Set<DefussTauriCommand>(["dev", "build", "init", "doctor"]);
const platforms = new Set<DefussTauriPlatform>(["native", "macos", "windows", "linux"]);

const readFlagValue = (args: string[], index: number, flag: string): string => {
  const next = args[index + 1];
  if (!next || next.startsWith("-")) throw new Error(`Missing value for ${flag}`);
  return next;
};

const parsePort = (value: string): number => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port: ${value}`);
  return port;
};

const parsePlatform = (value: string): DefussTauriPlatform => {
  if (!platforms.has(value as DefussTauriPlatform)) throw new Error(`Invalid platform: ${value}`);
  return value as DefussTauriPlatform;
};

const parseArgs = (args: string[]): DefussTauriOptions => {
  const positional: string[] = [];
  const options: Partial<DefussTauriOptions> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (arg === "--debug" || arg === "-d") {
      options.debug = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-ssg") {
      options.skipSsg = true;
      continue;
    }
    if (arg === "--skip-install") {
      options.skipInstall = true;
      continue;
    }
    if (arg === "--skip-node") {
      options.skipNode = true;
      continue;
    }
    if (arg === "--skip-ssg-install") {
      options.skipSsgInstall = true;
      continue;
    }
    if (arg === "--strict-security") {
      options.dangerouslyPermissive = false;
      continue;
    }
    if (arg === "--platform") {
      options.platform = parsePlatform(readFlagValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg.startsWith("--platform=")) {
      options.platform = parsePlatform(arg.slice("--platform=".length));
      continue;
    }
    if (arg === "--target") {
      options.target = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
      continue;
    }
    if (arg === "--port" || arg === "-p") {
      options.port = parsePort(readFlagValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = parsePort(arg.slice("--port=".length));
      continue;
    }
    if (arg === "--host" || arg === "-H") {
      options.host = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
      continue;
    }
    if (arg === "--app-name") {
      options.appName = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--app-name=")) {
      options.appName = arg.slice("--app-name=".length);
      continue;
    }
    if (arg === "--identifier") {
      options.identifier = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--identifier=")) {
      options.identifier = arg.slice("--identifier=".length);
      continue;
    }
    if (arg === "--version") {
      options.version = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--version=")) {
      options.version = arg.slice("--version=".length);
      continue;
    }
    if (arg === "--ssg-output") {
      options.ssgOutput = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--ssg-output=")) {
      options.ssgOutput = arg.slice("--ssg-output=".length);
      continue;
    }
    if (arg === "--managed-dir") {
      options.managedDirName = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--managed-dir=")) {
      options.managedDirName = arg.slice("--managed-dir=".length);
      continue;
    }
    if (arg === "--tauri-out") {
      options.tauriOutDir = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--tauri-out=")) {
      options.tauriOutDir = arg.slice("--tauri-out=".length);
      continue;
    }
    if (arg === "--node-version") {
      options.nodeVersion = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--node-version=")) {
      options.nodeVersion = arg.slice("--node-version=".length);
      continue;
    }
    if (arg === "--node-dist-base-url") {
      options.nodeDistBaseUrl = readFlagValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith("--node-dist-base-url=")) {
      options.nodeDistBaseUrl = arg.slice("--node-dist-base-url=".length);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }

  let command: DefussTauriCommand = "dev";
  let projectDir = ".";

  if (positional.length === 1) {
    if (commands.has(positional[0] as DefussTauriCommand)) command = positional[0] as DefussTauriCommand;
    else projectDir = positional[0];
  } else if (positional.length === 2) {
    if (!commands.has(positional[0] as DefussTauriCommand)) throw new Error(`Unknown command: ${positional[0]}`);
    command = positional[0] as DefussTauriCommand;
    projectDir = positional[1];
  } else if (positional.length > 2) {
    throw new Error("Too many positional arguments");
  }

  return { ...options, command, projectDir } as DefussTauriOptions;
};

const main = async (): Promise<void> => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await runDefussTauri(options);
    console.log(result.message);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage);
    process.exit(1);
  }
};

main();
