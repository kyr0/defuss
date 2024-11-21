import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, rmSync } from "node:fs";

export const defaultScmHostPattern = /^(https:\/\/(?:github|gitlab|bitbucket)\.com)\/([^\/]+)\/([^\/]+)\/(?:tree|src)\/([^\/]+)\/(.+)$/;

export const performSparseCheckout = (repoUrl: string, destFolder?: string, scmHostPattern = defaultScmHostPattern) => {
  try {
    const match = repoUrl.match(scmHostPattern);

    if (!match) {
      throw new Error("Invalid URL format. Use a subdirectory URL (https) from GitHub, GitLab, or Bitbucket.");
    }

    const [, platform, owner, repo, branch, subdir] = match;
    const fallbackDestFolder = subdir.split('/').pop()!;
    const resolvedDestFolder = destFolder || fallbackDestFolder;
    const targetPath = resolve(process.cwd(), resolvedDestFolder);

    if (existsSync(targetPath)) {
      throw new Error(`Destination folder "${resolvedDestFolder}" already exists.`);
    }

    console.log("Cloning repository with sparse checkout...");
    execSync(`git clone --no-checkout ${platform}/${owner}/${repo}.git "${targetPath}"`, { stdio: "inherit" });

    process.chdir(targetPath);

    console.log("Initializing sparse-checkout...");
    execSync("git sparse-checkout init", { stdio: "inherit" });
    execSync(`git sparse-checkout set ${subdir}`, { stdio: "inherit" });

    console.log(`Checking out branch: ${branch}...`);
    execSync(`git checkout ${branch}`, { stdio: "inherit" });

    console.log(`Sparse checkout completed in: ${targetPath}`);

    console.log("Cleaning up repository...");
    rmSync(`${targetPath}/.git`, { recursive: true, force: true });

    console.log("Initializing a new git repository...");
    execSync("git init", { cwd: targetPath, stdio: "inherit" });

    console.log("🎉 All done! Your new project has been set up!");

    console.log(`\nTo get started, run the following commands:\n\n  cd ${resolvedDestFolder}\n`);

  } catch (err) {
    console.error("Error during sparse checkout:", (err as Error).message);
    process.exit(1);
  }
};
