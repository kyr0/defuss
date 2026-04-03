import {execSync} from 'node:child_process';
import {mkdirSync, existsSync, rmSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Downloads a specific folder from a Git repository using Node.js APIs.
 * @param repoUrl - The URL of the repository (e.g., https://github.com/microsoft/fluentui-system-icons.git)
 * @param folderPath - The folder inside the repo to checkout (e.g., "assets")
 * @param targetDir - Local directory to save the content
 * @param branch - The branch to pull from (default: "main")
 */
export const checkoutGitPath = (
	repoUrl: string,
	folderPath: string,
	targetDir: string,
	branch: string = 'main'
): void => {
	// 1. Create target directory if it doesn't exist
	if (existsSync(targetDir)) {
		rmSync(targetDir,{ recursive: true});
	}
	mkdirSync(targetDir, {recursive: true});
	// Helper to run commands in the target directory
	const run = (cmd: string) => {
		console.log(`Running: ${cmd}`);
		return execSync(cmd, {cwd: targetDir, stdio: 'inherit'});
	};

	try {
		// 2. Initialize a new git repo locally
		run('git init');

		// 3. Add the remote
		run(`git remote add -f origin ${repoUrl}`);

		// 4. Enable sparse checkout feature
		run('git config core.sparseCheckout true');

		// 5. Define which folder to pull
		// On Windows, use double quotes or specific escape sequences if needed
		run(`echo "${folderPath}/*" >> .git/info/sparse-checkout`);

		// 6. Pull the specific branch
		run(`git pull origin ${branch}`);

		console.log(`✅ Successfully checked out ${folderPath} to ${targetDir}`);
	} catch (error) {
		throw new Error(`Git checkout failed: ${error instanceof Error ? error.message : String(error)}`);
	}
};
