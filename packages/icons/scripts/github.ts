import {FileCache} from "./FileCache";
import {fetchAsText, saveFile} from "./utils";

export const downloadGithubFolder = async (repo: string, path: string, targetDir: string): Promise<void> => {
	const files = await getGithubDirectoryInfo(repo, path)

	// 2. Filter for files only (ignore subfolders) and download
	for (const file of files) {
		if (file.type === 'file') {
			console.log(`Downloading ${file.name}...`);
			const content = await fetchAsText(file.download_url);
			await saveFile(targetDir, file.name, content);
		}
	}
}


export interface GHDirectoryInfo {
	name: string
	path: string
	sha: string
	size: number
	url: string
	html_url: string
	git_url: string
	download_url: any
	type: string
	_links: Links
}

export interface Links {
	self: string
	git: string
	html: string
}


const ghInfoCache = new FileCache<GHDirectoryInfo[]>('gh_api_contents');


/**
 * Fetches the list of icon names by reading the 'assets' directory names
 */
export const getGithubDirectoryInfo = async (repo: string, path: string): Promise<Array<GHDirectoryInfo>> => {
	const githubApiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

	const fromCache = await ghInfoCache.get(githubApiUrl);
	if(fromCache){
		return fromCache;
	}
	// Note: You might need a GITHUB_TOKEN if you run this often (Rate Limits)
	const response = await fetch(githubApiUrl);

	if (!response.ok) {
		throw new Error(`Failed to fetch github contents: ${githubApiUrl} ${response.status} ${response.statusText}`);
	}

	return await ghInfoCache.set(githubApiUrl, await response.json() as GHDirectoryInfo[]);
}

const ghTreeCache = new FileCache<TreeRoot>('gh_api_tree');

export interface TreeRoot {
	sha: string
	url: string
	tree: TreeNode[]
}

export interface TreeNode {
	path: string
	mode: string
	type: string
	sha: string
	url: string
	size?: number
}

/**
 * 1. GET /repos/microsoft/fluentui-system-icons/contents/
 * 2. Find the object where name === 'assets'
 * 3. Grab that 'sha' (e.g., "a1b2c3d4...")
 * 4. GET /repos/microsoft/fluentui-system-icons/git/trees/a1b2c3d4...?recursive=1
 */
export const getFolderTreeDirectly= async (repo: string, folderName: string): Promise<Array<TreeNode>> => {
	// Get top-level contents to find the folder's SHA
	const root = await getGithubDirectoryInfo(repo, '');
	const folder = root.find((item) => item.name === folderName);

	if (!folder || !folder.sha) throw new Error("Folder SHA not found");

	// Get the recursive tree for THAT specific SHA
	const githubApiUrl = `https://api.github.com/repos/${repo}/git/trees/${folder.sha}?recursive=1`;
	const fromCache = await ghTreeCache.get(githubApiUrl);
	if(fromCache){
		return fromCache.tree;
	}

	const response = await fetch(githubApiUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch github tree: ${githubApiUrl} ${response.status} ${response.statusText}`);
	}
	return (await ghTreeCache.set(githubApiUrl, await response.json() as TreeRoot)).tree;
}

