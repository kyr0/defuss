import {mkdir, writeFile, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {optimize, Config} from 'svgo';
import {FileCache} from "./FileCache";

/**
 * Fetches content from a URL and returns it as a string.
 * Throws an exception if the HTTP request fails.
 */
export const fetchAsText = async (input: string | URL | Request,
                                  init?: RequestInit): Promise<string> => {
	const response = await fetch(input, init);

	if (!response.ok) {
		// Standardizing the exception throwing
		throw new Error(`Failed to fetch ${response.url}: ${response.status} ${response.statusText}`);
	}

	return await response.text();
}

/**
 * Fetches content from a URL and returns it as a json <T>.
 * Throws an exception if the HTTP request fails.
 */
export const fetchAsJSON = async <T = unknown>(
	input: string | URL | Request,
	init?: RequestInit,): Promise<T> => {
	return JSON.parse(await fetchAsText(input, init)) as T;
}

export const ensureDir = async (path: string): Promise<void> => {
	await mkdir(path, {recursive: true});
}

export const saveFile = async (path: string, fileName: string, content: string | Buffer): Promise<string> => {
	await ensureDir(path);
	const filePath = join(path, fileName)
	await writeFile(filePath, content, 'utf8');
	return filePath
}

/**
 * Splits an array into chunks of a specified size.
 * * @param array - The source array to be chunked.
 * @param size - The max size of each chunk.
 * @returns An array containing the chunked sub-arrays.
 */
export const chunkArray = <T>(array: T[], size: number): T[][] => {
	const chunks: T[][] = [];

	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}

	return chunks;
};

/**
 * Optimizes an SVG string and optionally modifies it.
 */
export const optimizeSvg = (svgString: string): string => {
	const result = optimize(svgString, {
		multipass: true, // optimize multiple times for smallest size
		plugins: [
			'preset-default',
			{
				name: 'removeAttrs',
				params: {attrs: 'id'}
			},
			{
				name: 'addAttributesToSVGElement',
				params: {
					attributes: [{fill: 'currentColor'}]
				}
			}
		]
	});

	return result.data;
};

export const fileExists = async (path: string): Promise<boolean> => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

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

const ghTreeCache = new FileCache<{tree: any}>('gh_api_tree');

/**
 * 1. GET /repos/microsoft/fluentui-system-icons/contents/
 * 2. Find the object where name === 'assets'
 * 3. Grab that 'sha' (e.g., "a1b2c3d4...")
 * 4. GET /repos/microsoft/fluentui-system-icons/git/trees/a1b2c3d4...?recursive=1
 */
export const getFolderTreeDirectly= async (repo: string, folderName: string): Promise<any> => {
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
	return (await ghTreeCache.set(githubApiUrl, await response.json())).tree;
}


export const removePrefix = (prefix: string, str: string): string => {
	if (str.startsWith(prefix)) {
		return str.substring(prefix.length);
	}
	return str
}

export const removeSuffix = (suffix: string, str: string): string => {
	if (str.endsWith(suffix)) {
		return str.substring(0, str.length - suffix.length);
	}
	return str
}
