import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export const defaultScmHostPattern = /^(https:\/\/(?:github|gitlab|bitbucket)\.com)\/([^\/]+)\/([^\/]+)\/(?:tree|src)\/([^\/]+)\/(.+)$/

export const performSparseCheckout = (repoUrl: string, destFolder?: string, scmHostPattern = defaultScmHostPattern) => {
  try {
    // Match the repoUrl against the scmHostPattern
    const match = repoUrl.match(scmHostPattern);

    // If the URL doesn't match any expected format, log an error and exit
    if (!match) {
      console.error(
        "Invalid URL format. Use a subdirectory URL (https) from GitHub, GitLab, or Bitbucket."
      );
      process.exit(1);
    }

    // Destructure the matched groups into variables for platform, owner, repo, branch, and subdir
    const [, platform, owner, repo, branch, subdir] = match;

    // Use subdir as the fallback destination folder if destFolder is not provided
    const fallbackDestFolder = subdir.split('/').pop()!; // Use the last part of the subdir as folder name
    const resolvedDestFolder = destFolder || fallbackDestFolder;

    // Construct the repository clone URL based on the platform
    const repoCloneUrl = `${platform}/${owner}/${repo}.git`;
    // Resolve the target path for the destination folder
    const targetPath = resolve(process.cwd(), resolvedDestFolder);

    // Check if the destination folder already exists, log an error and exit if it does
    if (existsSync(targetPath)) {
      console.error(`Destination folder "${resolvedDestFolder}" already exists.`);
      process.exit(1);
    }
    
    // Log the start of the cloning process
    console.log("Cloning repository with sparse checkout...");

    // Execute the git clone command with no checkout to the target path
    execSync(`git clone --no-checkout ${repoCloneUrl} "${targetPath}"`, {
      // Inherit stdio to display command output in the console
      stdio: "inherit", 
    });

    // Change the current working directory to the target path
    process.chdir(targetPath);

    // Log the initialization of sparse-checkout
    console.log("Initializing sparse-checkout...");
    // Execute the git sparse-checkout init command
    execSync("git sparse-checkout init", { stdio: "inherit" });

    // Log the setting of the sparse path
    console.log(`Setting sparse path to: ${subdir}...`);

    // Execute the git sparse-checkout set command with the specified subdir
    execSync(`git sparse-checkout set ${subdir}`, { stdio: "inherit" });

    // Log the branch checkout process
    console.log(`Checking out branch: ${branch}...`);

    // Execute the git checkout command for the specified branch
    execSync(`git checkout ${branch}`, { stdio: "inherit" });

    // Log the completion of the sparse checkout
    console.log(`Sparse checkout completed in: ${targetPath}`);
    
  } catch (err) {
    // Log any errors that occur during the process
    console.error("Error during sparse checkout:", (err as Error).message);
    process.exit(1); // Exit with an error code
  }
};
