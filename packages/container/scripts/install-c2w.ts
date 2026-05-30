import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const binDir = resolve(root, ".tools", "bin");
await mkdir(binDir, { recursive: true });

const os = process.platform;
const arch = process.arch;

if (os !== "linux" && os !== "darwin") {
  throw new Error("setup only supports Linux and macOS hosts. On Windows, use WSL2.");
}

const osPatterns = os === "darwin" ? ["darwin", "macos"] : ["linux"];
const archPatterns = arch === "x64"
  ? ["amd64", "x86_64"]
  : arch === "arm64"
    ? ["arm64", "aarch64"]
    : [];

if (archPatterns.length === 0) {
  throw new Error(`unsupported architecture for setup: ${os}/${arch}`);
}

const res = await fetch("https://api.github.com/repos/ktock/container2wasm/releases/latest", {
  headers: {
    "accept": "application/vnd.github+json",
    "user-agent": "bun-wasi-shell-setup",
  },
});
if (!res.ok) {
  throw new Error(`failed to query container2wasm releases: ${res.status} ${res.statusText}`);
}

const release = await res.json();
const assets: Array<{ browser_download_url: string; name: string }> = release.assets ?? [];
const asset = assets.find((item) => {
  const lower = item.name.toLowerCase();
  return lower.endsWith(".tar.gz")
    && osPatterns.some((p) => lower.includes(p))
    && archPatterns.some((p) => lower.includes(p));
});

if (asset) {
  // Prebuilt binary available (Linux) — download and extract
  const tmpFile = resolve(root, ".cache", asset.name);
  await mkdir(resolve(root, ".cache"), { recursive: true });

  const dl = await fetch(asset.browser_download_url, {
    headers: { "user-agent": "bun-wasi-shell-setup" },
  });
  if (!dl.ok) {
    throw new Error(`failed to download ${asset.browser_download_url}: ${dl.status} ${dl.statusText}`);
  }
  await Bun.write(tmpFile, await dl.arrayBuffer());

  const untar = Bun.spawnSync(["tar", "-xzf", tmpFile, "-C", binDir], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if (untar.exitCode !== 0) {
    throw new Error("failed to extract container2wasm release tarball");
  }

  console.log(`installed ${asset.name} into ${binDir}`);
} else {
  // No prebuilt binary (e.g. macOS) — build from source with Go
  const goCheck = Bun.spawnSync(["go", "version"], { stdout: "pipe", stderr: "pipe" });
  if (goCheck.exitCode !== 0) {
    throw new Error(
      `no prebuilt c2w binary for ${os}/${arch} and Go is not installed. ` +
      `Install Go (https://go.dev/dl/) or run on Linux.`
    );
  }

  console.log(`no prebuilt binary for ${os}/${arch}, building c2w from source with Go...`);

  const version = release.tag_name ?? "latest";
  const srcDir = resolve(root, ".cache", "container2wasm");

  // Clone or update the repo
  const { existsSync } = await import("node:fs");
  if (existsSync(resolve(srcDir, ".git"))) {
    Bun.spawnSync(["git", "fetch", "--tags"], { cwd: srcDir, stdout: "inherit", stderr: "inherit" });
  } else {
    await mkdir(resolve(root, ".cache"), { recursive: true });
    const clone = Bun.spawnSync(
      ["git", "clone", "--depth", "1", "--branch", version, "https://github.com/ktock/container2wasm.git", srcDir],
      { stdout: "inherit", stderr: "inherit" },
    );
    if (clone.exitCode !== 0) {
      throw new Error("failed to clone container2wasm repository");
    }
  }

  // Checkout the target version
  Bun.spawnSync(["git", "checkout", version], { cwd: srcDir, stdout: "inherit", stderr: "inherit" });

  // Build c2w
  const goBuild = Bun.spawnSync(
    ["go", "build", "-o", resolve(binDir, "c2w"), "./cmd/c2w"],
    {
      cwd: srcDir,
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  if (goBuild.exitCode !== 0) {
    throw new Error("failed to build c2w from source");
  }

  console.log(`built c2w ${version} from source into ${binDir}`);
}
