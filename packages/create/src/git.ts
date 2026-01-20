import { spawnSync } from "node:child_process";
import {
  resolve,
  join,
  normalize,
  isAbsolute,
  sep,
  basename,
} from "node:path";
import {
  existsSync,
  rmSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  lstatSync,
  readlinkSync,
  symlinkSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";

export const defaultScmHostPattern =
  /^(https:\/\/(?:github|gitlab|bitbucket)\.com)\/([^\/]+)\/([^\/]+)\/(?:tree|src)\/([^\/]+)\/(.+)$/;

export const performSparseCheckout = (
  repoUrl: string,
  destFolder?: string,
  scmHostPattern = defaultScmHostPattern
) => {
  try {
    const match = repoUrl.match(scmHostPattern);

    if (!match) {
      throw new Error(
        "Invalid URL format. Use a subdirectory URL (https) from GitHub, GitLab, or Bitbucket."
      );
    }

    const [, platformUrl, owner, repo, branch, subdir] = match;

    // Validate inputs to prevent command injection and path traversal
    [owner, repo, branch].forEach((input) => {
      if (!/^[\w\-]+$/.test(input)) {
        throw new Error(`Invalid characters in input: ${input}`);
      }
    });

    // Validate subdir
    const subdirNormalized = normalize(subdir);

    // Check if subdir is absolute or contains path traversal
    if (
      isAbsolute(subdirNormalized) ||
      subdirNormalized.startsWith("..") ||
      subdirNormalized.includes(`${sep}..${sep}`)
    ) {
      throw new Error("Invalid subdirectory path.");
    }

    const sanitizedSubdir = subdirNormalized;

    const fallbackDestFolder = destFolder || basename(sanitizedSubdir);
    const targetPath = resolve(process.cwd(), fallbackDestFolder);

    if (existsSync(targetPath)) {
      throw new Error(`Destination folder "${fallbackDestFolder}" already exists.`);
    }

    // Create the destination directory
    mkdirSync(targetPath, { recursive: true });

    // Create a temporary directory for the clone
    const tempDir = mkdtempSync(join(tmpdir(), "sparse-checkout-"));

    console.log("Cloning repository with sparse checkout into temporary directory...");
    const cloneResult = spawnSync(
      "git",
      ["clone", "--no-checkout", `${platformUrl}/${owner}/${repo}.git`, tempDir],
      { stdio: "inherit" }
    );
    if (cloneResult.status !== 0) {
      throw new Error("Git clone failed.");
    }

    const subdirPath = resolve(tempDir, sanitizedSubdir);

    // Ensure subdirPath is within tempDir
    if (!subdirPath.startsWith(tempDir + sep) && subdirPath !== tempDir) {
      throw new Error("Subdirectory path traversal detected.");
    }

    console.log("Initializing sparse-checkout...");
    const initResult = spawnSync("git", ["-C", tempDir, "sparse-checkout", "init"], {
      stdio: "inherit",
    });
    if (initResult.status !== 0) {
      throw new Error("Git sparse-checkout init failed.");
    }

    console.log(`Setting sparse-checkout to subdirectory: ${sanitizedSubdir}`);
    const setResult = spawnSync(
      "git",
      ["-C", tempDir, "sparse-checkout", "set", sanitizedSubdir],
      { stdio: "inherit" }
    );
    if (setResult.status !== 0) {
      throw new Error("Git sparse-checkout set failed.");
    }

    console.log(`Checking out branch: ${branch}...`);
    const checkoutResult = spawnSync("git", ["-C", tempDir, "checkout", branch], {
      stdio: "inherit",
    });
    if (checkoutResult.status !== 0) {
      throw new Error("Git checkout failed.");
    }

    if (!existsSync(subdirPath)) {
      throw new Error(`Subdirectory "${sanitizedSubdir}" does not exist in the repository.`);
    }

    console.log("Copying files to the destination directory...");
    copyDirectoryContents(subdirPath, targetPath);

    console.log("Replacing workspace:* versions with latest npm versions...");
    replaceWorkspaceVersions(targetPath);

    console.log("Cleaning up temporary directory...");
    rmSync(tempDir, { recursive: true, force: true });

    console.log("Initializing a new git repository...");
    const initNewRepoResult = spawnSync("git", ["init"], {
      cwd: targetPath,
      stdio: "inherit",
    });
    if (initNewRepoResult.status !== 0) {
      throw new Error("Initializing new git repository failed.");
    }

    console.log("🎉 All done! Your new project has been set up!");

    console.log(`\nTo get started, run the following commands:\n\n  cd ${fallbackDestFolder}\n`);
  } catch (err) {
    console.error("Error during sparse checkout:", (err as Error).message);
    process.exit(1);
  }
};

/**
 * Gets the latest version of a package from npm.
 */
function getNpmLatestVersion(packageName: string): string | null {
  const result = spawnSync("npm", ["view", packageName, "version"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status === 0 && result.stdout) {
    return result.stdout.trim();
  }
  return null;
}

/**
 * Replaces all "workspace:*" versions in the root package.json with the latest npm versions.
 */
function replaceWorkspaceVersions(targetPath: string): void {
  const packageJsonPath = join(targetPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    console.log("No package.json found in the root, skipping workspace version replacement.");
    return;
  }

  const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContent);

  let hasChanges = false;

  const depTypes = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

  for (const depType of depTypes) {
    const deps = packageJson[depType];
    if (!deps || typeof deps !== "object") continue;

    for (const [pkgName, version] of Object.entries(deps)) {
      if (typeof version === "string" && version.startsWith("workspace:")) {
        console.log(`Resolving latest npm version for ${pkgName}...`);
        const latestVersion = getNpmLatestVersion(pkgName);

        if (latestVersion) {
          console.log(`  ${pkgName}: workspace:* -> ^${latestVersion}`);
          deps[pkgName] = `^${latestVersion}`;
          hasChanges = true;
        } else {
          console.warn(`  Warning: Could not fetch latest version for ${pkgName}, keeping workspace:* reference.`);
        }
      }
    }
  }

  if (hasChanges) {
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf-8");
    console.log("Updated package.json with resolved npm versions.");
  } else {
    console.log("No workspace:* versions found in package.json.");
  }
}

/**
 * Recursively copies all files and directories from `source` to `destination`.
 */
function copyDirectoryContents(source: string, destination: string) {
  if (!existsSync(source)) {
    throw new Error(`Source directory "${source}" does not exist.`);
  }

  const items = readdirSync(source);

  for (const item of items) {
    const srcPath = join(source, item);
    const destPath = join(destination, item);
    const stats = lstatSync(srcPath);

    if (stats.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDirectoryContents(srcPath, destPath);
    } else if (stats.isSymbolicLink()) {
      const symlink = readlinkSync(srcPath);
      symlinkSync(symlink, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
