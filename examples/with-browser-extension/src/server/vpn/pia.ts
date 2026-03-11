import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ConnectionState =
  | "Disconnected"
  | "Connecting"
  | "StillConnecting"
  | "Connected"
  | "Interrupted"
  | "Reconnecting"
  | "StillReconnecting"
  | "DisconnectingToReconnect"
  | "Disconnecting";

export type SwitchIpResult = {
  region: string;
  ip: string;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const CONNECT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 750;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const randomItem = <T>(items: readonly T[]): T => {
  if (items.length === 0) {
    throw new Error("Cannot choose a random item from an empty list");
  }
  return items[Math.floor(Math.random() * items.length)];
};

const canExecute = (path: string): boolean => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const resolvePiactlPath = (): string => {
  const envPath = process.env.PIACTL_PATH?.trim();
  const candidates = [
    envPath,
    "/usr/local/bin/piactl",
    "/Applications/Private Internet Access.app/Contents/MacOS/piactl",
    "piactl",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate === "piactl") {
      return candidate;
    }
    if (canExecute(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find piactl. Set PIACTL_PATH or install the Private Internet Access client.",
  );
};

const piactlPath = resolvePiactlPath();

const run = async (
  args: readonly string[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> => {
  try {
    const { stdout } = await execFileAsync(piactlPath, [...args], {
      timeout: timeoutMs,
    });
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      stdout?: unknown;
      stderr?: unknown;
    };

    const details = [
      err.message,
      typeof err.stderr === "string"
        ? err.stderr.trim()
        : err.stderr?.toString().trim(),
      typeof err.stdout === "string"
        ? err.stdout.trim()
        : err.stdout?.toString().trim(),
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(
      `piactl ${args.join(" ")} failed${details ? `\n${details}` : ""}`,
    );
  }
};

const getRegions = async (): Promise<string[]> => {
  const output = await run(["get", "regions"]);
  return output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value !== "auto");
};

const getRegion = async (): Promise<string | null> => {
  try {
    const region = await run(["get", "region"]);
    return region || null;
  } catch {
    return null;
  }
};

const setRegion = async (region: string): Promise<void> => {
  await run(["set", "region", region]);
};

const connect = async (): Promise<void> => {
  await run(["connect"]);
};

const getConnectionState = async (): Promise<ConnectionState | null> => {
  try {
    const raw = await run(["get", "connectionstate"]);
    return raw.replace(/\s+/g, "") as ConnectionState;
  } catch {
    return null;
  }
};

const isValidIp = (value: string): boolean =>
  Boolean(value) && value !== "Unknown";

const getVpnIp = async (): Promise<string | null> => {
  try {
    const value = await run(["get", "vpnip"]);
    return isValidIp(value) ? value : null;
  } catch {
    return null;
  }
};

const waitForVpnIp = async (
  timeoutMs = CONNECT_TIMEOUT_MS,
): Promise<string> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ip = await getVpnIp();
    if (ip) return ip;
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Timed out waiting for PIA to report a VPN IP");
};

const waitUntilConnected = async (
  timeoutMs = CONNECT_TIMEOUT_MS,
): Promise<void> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const state = await getConnectionState();
    if (state === "Connected") {
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Timed out waiting for PIA to report Connected");
};

const ensureValidRegion = async (region: string): Promise<void> => {
  const regions = await getRegions();
  if (!regions.includes(region)) {
    throw new Error(`Unknown PIA region: ${region}`);
  }
};

const chooseTargetRegion = async (
  requestedRegion?: string,
): Promise<string> => {
  if (requestedRegion) {
    await ensureValidRegion(requestedRegion);
    return requestedRegion;
  }

  const [regions, currentRegion] = await Promise.all([
    getRegions(),
    getRegion(),
  ]);
  const alternatives = regions.filter((region) => region !== currentRegion);

  if (alternatives.length > 0) {
    return randomItem(alternatives);
  }

  if (regions.length > 0) {
    return randomItem(regions);
  }

  throw new Error("PIA returned no usable regions");
};

const switchToRegion = async (region: string): Promise<SwitchIpResult> => {
  await setRegion(region);
  await connect(); // reconnects if already connected
  await waitUntilConnected();

  const ip = await waitForVpnIp();
  return { region, ip };
};

export const switchIp = async (region?: string): Promise<SwitchIpResult> => {
  const beforeIp = await getVpnIp();
  const targetRegion = await chooseTargetRegion(region);
  const firstResult = await switchToRegion(targetRegion);

  if (region || !beforeIp || firstResult.ip !== beforeIp) {
    return firstResult;
  }

  const currentRegion = firstResult.region;
  const regions = await getRegions();
  const fallbackRegions = regions.filter((value) => value !== currentRegion);

  for (const nextRegion of fallbackRegions) {
    const nextResult = await switchToRegion(nextRegion);
    if (nextResult.ip !== beforeIp) {
      return nextResult;
    }
  }

  return firstResult;
};
