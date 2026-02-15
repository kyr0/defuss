

<full-context-dump>
./LICENSE:
```
MIT License

Copyright (c) 2019 - 2026 Aron Homberg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

./package.json:
```
{
  "name": "create-defuss",
  "version": "1.0.10",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "license": "MIT",
  "description": "Checks out git projects from sub-directories. Originally for jump-starting defuss projects from templates.",
  "keywords": [
    "git",
    "sparse-checkout",
    "template",
    "typescript"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/kyr0/defuss.git"
  },
  "scripts": {
    "clean": "rm -rf ./dist",
    "pretest": "bun run build",
    "prebuild": "bun run clean",
    "build": "pkgroll --minify --sourcemap",
    "e2e": "bun run build && node ./dist/e2e.mjs"
  },
  "author": "Aron Homberg <info@aron-homberg.de>",
  "exports": {
    ".": {
      "types": "./dist/cli.d.ts",
      "import": "./dist/cli.mjs",
      "require": "./dist/cli.cjs"
    },
    "./e2e": {
      "import": "./dist/e2e.mjs"
    }
  },
  "bin": {
    "create-defuss": "./dist/cli.mjs"
  },
  "main": "./dist/cli.cjs",
  "module": "./dist/cli.mjs",
  "types": "./dist/cli.d.ts",
  "files": [
    "dist",
    "assets"
  ],
  "devDependencies": {
    "pkgroll": "^2.21.5",
    "typescript": "^5.9.3"
  }
}
```

./README.md:
```
<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

Project Scaffolder

</sup>

</h1>

> `create-defuss` is a simple, lightweight CLI tool and Node.js library that enables Git sparse checkouts for subdirectories of GitHub repositories. Originally created to help jump-start projects using **defuss templates**, it can be used for any Git repository.

**💡 Did you know?** With just one command, you can checkout a specific subdirectory from a GitHub repository without cloning the entire project.

---

<h3 align="center">

🚀 Getting Started

</h3>

You're just one step away from checking out one of `defuss` simple example projects:

### Create a new `defuss` + `Astro` project:

> **[‼️]** Make sure [`git`](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) is installed on your computer!

```bash
bunx create-defuss https://github.com/kyr0/defuss/tree/main/examples/with-astro-ts
```
This will download **only** the code from the `with-astro-ts` subdirectory into the _(new)_ folder local folder.

### Create a new `defuss` + `Vite` project:

> **[‼️]** Make sure [`git`](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) is installed on your computer!

```bash
bunx create-defuss https://github.com/kyr0/defuss/tree/main/examples/with-vite-ts
```
This will download **only** the code from the `with-vite-ts` subdirectory into the _(new)_ folder local folder.

#### Downloading into a custom local folder

```bash
bunx create-defuss https://github.com/kyr0/defuss/tree/main/examples/with-vite-ts ./my-custom-defuss-project
```
This will download **only** the code from the `with-vite-ts` subdirectory into the _(new)_ folder local folder `my-custom-defuss-project`.

<h3 align="center">

⚙️ API usage

</h3>

You can also use `create-defuss` as library. It's super simple:

```ts
import { performSparseCheckout } from "create-defuss"

// pass in the Git url and desired destination folder (relative to the current working directory)
performSparseCheckout("git_url", "dest_folder")
```


<h3 align="center">

🚀 How does `defuss-vite` work?

</h3>

`create-defuss` is an NPM package with a `bin` entry in `package.json`. This, combined with a "shebang" line (`#!/someshell`) makes it executable using `bunx` as a CLI (command line interface). It uses Git sparse checkout to efficiently download files from a specific subdirectory of a GitHub repository. It avoids downloading the entire repository, saving bandwidth and time. Also, monorepo maintainers can spare on creating extra "template" repositories for their example code.

Inside the project, you'll find the following relevant files:

```text
/
├── src/cli.ts
├── src/git.ts
├── package.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the plugin. |
| `npm publish`    | Publish a new version of the `defuss-vite` integration package. |

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>
```

./src/cli.ts:
```
#!/usr/bin/env node

import { performSparseCheckout } from "./git.js";

export * from "./git.js";

// define an asynchronous main function to handle the CLI logic
const main = async () => {
  // retrieve command-line arguments, excluding the first two (node and script path)
  const args = process.argv.slice(2);

  // check if the number of arguments is valid (either 1 or 2)
  if (args.length < 1 || args.length > 2) {
    // if not, print usage instructions and exit with an error code
    console.error(
      "Usage: create-defuss <repo-url> [destination-folder]\n" +
        "Example: create-defuss https://github.com/kyr0/defuss/tree/main/examples/with-astro-ts ./my-new-project"
    );
    process.exit(1);
  }

  // assign the first argument to repoUrl and the second to destFolder, defaulting to "." (current directory) if not provided
  const repoUrl = args[0];
  const destFolder = args[1];

  // call the performSparseCheckout function with the provided arguments
  performSparseCheckout(repoUrl, destFolder);
};

// execute the main function and handle any unexpected errors
main().catch((err) => {
  // log the error and exit with an error code
  console.error("Unexpected error:", err);
  process.exit(1);
});
```

./src/e2e.ts:
```
#!/usr/bin/env node

/**
 * E2E test for create-defuss package.
 * Checks out the create package itself from GitHub to verify all features work.
 */

import { performSparseCheckout } from "./git.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, rmSync, readFileSync, readdirSync } from "node:fs";

const TEST_URL = "https://github.com/kyr0/defuss/tree/main/packages/create";

async function runE2ETest(): Promise<void> {
    const testDir = join(tmpdir(), `create-defuss-e2e-${Date.now()}`);

    console.log("🧪 E2E Test for create-defuss");
    console.log("=".repeat(50));
    console.log(`Test URL: ${TEST_URL}`);
    console.log(`Test Directory: ${testDir}`);
    console.log("=".repeat(50));

    let passed = true;
    const results: { test: string; passed: boolean; message?: string }[] = [];

    try {
        // Test 1: Run sparse checkout
        console.log("\n📥 Running sparse checkout...\n");
        performSparseCheckout(TEST_URL, testDir);

        // Test 2: Verify destination folder exists
        console.log("\n🔍 Running verification checks...\n");

        if (existsSync(testDir)) {
            results.push({ test: "Destination folder created", passed: true });
        } else {
            results.push({ test: "Destination folder created", passed: false, message: "Folder does not exist" });
            passed = false;
        }

        // Test 3: Verify package.json exists
        const packageJsonPath = join(testDir, "package.json");
        if (existsSync(packageJsonPath)) {
            results.push({ test: "package.json exists", passed: true });

            // Test 4: Verify package.json is valid JSON
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
                results.push({ test: "package.json is valid JSON", passed: true });

                // Test 5: Verify package name
                if (packageJson.name === "create-defuss") {
                    results.push({ test: "Package name is correct", passed: true });
                } else {
                    results.push({ test: "Package name is correct", passed: false, message: `Expected 'create-defuss', got '${packageJson.name}'` });
                    passed = false;
                }

                // Test 6: Check that no workspace:* versions remain in package.json
                const hasWorkspaceRefs = checkForWorkspaceRefs(packageJson);
                if (!hasWorkspaceRefs) {
                    results.push({ test: "No workspace:* versions in package.json", passed: true });
                } else {
                    results.push({ test: "No workspace:* versions in package.json", passed: false, message: "Found workspace:* references" });
                    passed = false;
                }
            } catch (err) {
                results.push({ test: "package.json is valid JSON", passed: false, message: (err as Error).message });
                passed = false;
            }
        } else {
            results.push({ test: "package.json exists", passed: false, message: "File not found" });
            passed = false;
        }

        // Test 7: Verify src folder exists
        const srcPath = join(testDir, "src");
        if (existsSync(srcPath)) {
            results.push({ test: "src folder exists", passed: true });

            // Test 8: Verify key source files
            const expectedFiles = ["cli.ts", "git.ts"];
            for (const file of expectedFiles) {
                if (existsSync(join(srcPath, file))) {
                    results.push({ test: `src/${file} exists`, passed: true });
                } else {
                    results.push({ test: `src/${file} exists`, passed: false, message: "File not found" });
                    passed = false;
                }
            }
        } else {
            results.push({ test: "src folder exists", passed: false, message: "Folder not found" });
            passed = false;
        }

        // Test 9: Verify .git folder was created (new repo initialized)
        const gitPath = join(testDir, ".git");
        if (existsSync(gitPath)) {
            results.push({ test: "Git repository initialized", passed: true });
        } else {
            results.push({ test: "Git repository initialized", passed: false, message: ".git folder not found" });
            passed = false;
        }

        // Test 10: List all files for verification
        console.log("\n📁 Files in checkout:");
        listFilesRecursively(testDir, "", 2);

    } catch (err) {
        console.error("\n❌ Test execution failed:", (err as Error).message);
        passed = false;
        results.push({ test: "Checkout execution", passed: false, message: (err as Error).message });
    } finally {
        // Cleanup
        console.log("\n🧹 Cleaning up test directory...");
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
            console.log("✅ Test directory removed");
        }
    }

    // Report results
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST RESULTS");
    console.log("=".repeat(50));

    for (const result of results) {
        const icon = result.passed ? "✅" : "❌";
        const msg = result.message ? ` (${result.message})` : "";
        console.log(`${icon} ${result.test}${msg}`);
    }

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    console.log("\n" + "=".repeat(50));
    console.log(`📈 Summary: ${passedCount}/${totalCount} tests passed`);
    console.log("=".repeat(50));

    if (!passed) {
        console.log("\n❌ E2E TEST FAILED");
        process.exit(1);
    } else {
        console.log("\n✅ E2E TEST PASSED");
        process.exit(0);
    }
}

/**
 * Check if any dependency has workspace:* references
 */
function checkForWorkspaceRefs(packageJson: Record<string, unknown>): boolean {
    const depTypes = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

    for (const depType of depTypes) {
        const deps = packageJson[depType] as Record<string, string> | undefined;
        if (!deps || typeof deps !== "object") continue;

        for (const version of Object.values(deps)) {
            if (typeof version === "string" && version.startsWith("workspace:")) {
                return true;
            }
        }
    }
    return false;
}

/**
 * List files recursively with indentation (limited depth)
 */
function listFilesRecursively(dir: string, indent: string, maxDepth: number): void {
    if (maxDepth <= 0) {
        console.log(`${indent}...`);
        return;
    }

    const items = readdirSync(dir);
    for (const item of items) {
        if (item === ".git" || item === "node_modules") {
            console.log(`${indent}${item}/`);
            continue;
        }
        const itemPath = join(dir, item);
        try {
            const stat = require("fs").lstatSync(itemPath);
            if (stat.isDirectory()) {
                console.log(`${indent}${item}/`);
                listFilesRecursively(itemPath, indent + "  ", maxDepth - 1);
            } else {
                console.log(`${indent}${item}`);
            }
        } catch {
            console.log(`${indent}${item}`);
        }
    }
}

// Run the test
runE2ETest();

```

./src/git.ts:
```
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

```

./tsconfig.json:
```
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  }
}

```


</full-context-dump>
