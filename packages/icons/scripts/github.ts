import {FileCache} from "./FileCache";
import { fetchAsJSON, } from "./utils";

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

export interface TreeRoot {
	sha: string
	url: string
	tree: TreeNode[]
	truncated?: true
}

export interface TreeNode {
	path: string
	mode: string
	type: string
	sha: string
	url: string
	size?: number
}


export interface GithubRepositoryInfo {
	id: number
	node_id: string
	name: string
	full_name: string
	private: boolean
	owner: Owner
	html_url: string
	description: string
	fork: boolean
	url: string
	forks_url: string
	keys_url: string
	collaborators_url: string
	teams_url: string
	hooks_url: string
	issue_events_url: string
	events_url: string
	assignees_url: string
	branches_url: string
	tags_url: string
	blobs_url: string
	git_tags_url: string
	git_refs_url: string
	trees_url: string
	statuses_url: string
	languages_url: string
	stargazers_url: string
	contributors_url: string
	subscribers_url: string
	subscription_url: string
	commits_url: string
	git_commits_url: string
	comments_url: string
	issue_comment_url: string
	contents_url: string
	compare_url: string
	merges_url: string
	archive_url: string
	downloads_url: string
	issues_url: string
	pulls_url: string
	milestones_url: string
	notifications_url: string
	labels_url: string
	releases_url: string
	deployments_url: string
	created_at: string
	updated_at: string
	pushed_at: string
	git_url: string
	ssh_url: string
	clone_url: string
	svn_url: string
	homepage: string
	size: number
	stargazers_count: number
	watchers_count: number
	language: string
	has_issues: boolean
	has_projects: boolean
	has_downloads: boolean
	has_wiki: boolean
	has_pages: boolean
	has_discussions: boolean
	forks_count: number
	mirror_url: any
	archived: boolean
	disabled: boolean
	open_issues_count: number
	license: License
	allow_forking: boolean
	is_template: boolean
	web_commit_signoff_required: boolean
	has_pull_requests: boolean
	pull_request_creation_policy: string
	topics: string[]
	visibility: string
	forks: number
	open_issues: number
	watchers: number
	default_branch: string
	temp_clone_token: any
	custom_properties: CustomProperties
	organization: Organization
	network_count: number
	subscribers_count: number
}

export interface Owner {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	type: string
	user_view_type: string
	site_admin: boolean
}

export interface License {
	key: string
	name: string
	spdx_id: string
	url: string
	node_id: string
}

export interface CustomProperties {
	activeRepoStatus: string
	durableOwnershipDisable: string
	durableOwnershipNextCheckDate: string
	durableOwnershipWarn: string
	"global-rulesets-opt-out": string
}

export interface Organization {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	type: string
	user_view_type: string
	site_admin: boolean
}

const ghInfoCache = new FileCache<GHDirectoryInfo[]>('gh_api_contents');
const ghTreeCache = new FileCache<TreeRoot>('gh_api_tree');

export class GithubCli {

	private constructor(public readonly owner: string,
	                    public readonly repo: string,
	                    public readonly info: GithubRepositoryInfo) {
	}

	public static async create(owner: string, repo: string): Promise<GithubCli> {
		const info = await GithubCli.getRepositoryInfo(owner, repo);
		return new GithubCli(owner, repo, info);
	}

	private static async getRepositoryInfo(owner: string, repo: string): Promise<GithubRepositoryInfo> {
		return await fetchAsJSON<GithubRepositoryInfo>(`https://api.github.com/repos/${owner}/${repo}`, {
			headers: {
				"Accept": "application/vnd.github+json",
			}
		});
	}

	getRepoWithOwner = () => {
		return [this.owner, this.repo].join('/')
	}

	async getDirectoryInfo(directoryPath: string): Promise<Array<GHDirectoryInfo>> {
		const repoWithOwner = this.getRepoWithOwner()

		const githubApiUrl = `https://api.github.com/repos/${repoWithOwner}/contents/${directoryPath}`;

		const fromCache = await ghInfoCache.get(githubApiUrl);
		if (fromCache) {
			return fromCache;
		}
		// Note: You might need a GITHUB_TOKEN if you run this often (Rate Limits)
		const response = await fetch(githubApiUrl);

		if (!response.ok) {
			throw new Error(`Failed to fetch github contents: ${githubApiUrl} ${response.status} ${response.statusText}`);
		}

		return await ghInfoCache.set(githubApiUrl, await response.json() as GHDirectoryInfo[]);
	}

	async getFolderNodes(folderPath: string, recursive = true): Promise<Array<TreeNode>> {
		// Get top-level contents to find the folder's SHA
		const folderPathParts = folderPath.split('/')
		const folderName = folderPathParts.pop();
		const subPath = folderPathParts.join('/')
		const repoWithOwner = this.getRepoWithOwner()
		const root = await this.getDirectoryInfo(subPath);
		const folder = root.find((item) => item.name === folderName);

		const logIfTruncated = (treeRoot: TreeRoot) => {
			if (treeRoot.truncated) {
				// This means you only have a partial list of the assets!
				console.error(`⚠️ The assets ${folderPath} is too large for a single recursive call.`);
				console.log("Tip: Fetch sub-folders (A-M, N-Z) by their individual SHAs instead.");
			}
		}

		if (!folder || !folder.sha) throw new Error("Folder SHA not found");

		// Get the recursive tree for THAT specific SHA
		const githubApiUrl = `https://api.github.com/repos/${repoWithOwner}/git/trees/${folder.sha}${recursive?'?recursive=1': ''}`;
		const fromCache = await ghTreeCache.get(githubApiUrl);
		if (fromCache) {
			logIfTruncated(fromCache)
			return fromCache.tree;
		}

		const response = await fetch(githubApiUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch github tree: ${githubApiUrl} ${response.status} ${response.statusText}`);
		}
		const data = await response.json() as TreeRoot
		logIfTruncated(data)

		return (await ghTreeCache.set(githubApiUrl, data)).tree;
	}

	getDownloadUrl(filePath: string): string {
		return [
			'https://raw.githubusercontent.com',
			this.owner,this.repo,
			this.info.default_branch,
			filePath
		].join('/')
	}
}

