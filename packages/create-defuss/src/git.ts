import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export const defaultScmHostPattern = /^(https:\/\/(?:github|gitlab|bitbucket)\.com)\/([^\/]+)\/([^\/]+)\/(?:tree|src)\/([^\/]+)\/(.+)$/

export const performSparseCheckout = (repoUrl: string, destFolder: string, scmHostPattern = defaultScmHostPattern) => {
  try {
    // match the repoUrl against the scmHostPattern
    const match = repoUrl.match(scmHostPattern);

    // if the URL doesn't match any expected format, log an error and exit
    if (!match) {
      console.error(
        "Invalid URL format. Use a subdirectory URL from GitHub, GitLab, or Bitbucket."
      );
      process.exit(1);
    }

    // destructure the matched groups into variables for platform, owner, repo, branch, and subdir
    const [, platform, owner, repo, branch, subdir] = match;

    // construct the repository clone URL based on the platform
    const repoCloneUrl = `https://${platform}.com/${owner}/${repo}.git`;
    // resolve the target path for the destination folder
    const targetPath = resolve(process.cwd(), destFolder);

    // check if the destination folder already exists, log an error and exit if it does
    if (existsSync(targetPath)) {
      console.error(`Destination folder "${destFolder}" already exists.`);
      process.exit(1);
    }
    
    // log the start of the cloning process
    console.log("Cloning repository with sparse checkout...");

    // execute the git clone command with no checkout to the target path
    execSync(`git clone --no-checkout ${repoCloneUrl} "${targetPath}"`, {
      // inherit stdio to display command output in the console
      stdio: "inherit", 
    });

    // change the current working directory to the target path
    process.chdir(targetPath);

    // log the initialization of sparse-checkout
    console.log("Initializing sparse-checkout...");
    // execute the git sparse-checkout init command
    execSync("git sparse-checkout init", { stdio: "inherit" });

    // log the setting of the sparse path
    console.log(`Setting sparse path to: ${subdir}...`);

    // execute the git sparse-checkout set command with the specified subdir
    execSync(`git sparse-checkout set ${subdir}`, { stdio: "inherit" });

    // log the branch checkout process
    console.log(`Checking out branch: ${branch}...`);

    // execute the git checkout command for the specified branch
    execSync(`git checkout ${branch}`, { stdio: "inherit" });

    // log the completion of the sparse checkout
    console.log(`Sparse checkout completed in: ${targetPath}`);
    
  } catch (err) {
    // log any errors that occur during the process
    console.error("Error during sparse checkout:", (err as Error).message);
    process.exit(1); // exit with an error code
  }
};
