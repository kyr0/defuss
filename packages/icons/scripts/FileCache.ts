import {stat, writeFile, readFile} from "node:fs/promises";
import {join} from 'node:path';

export class FileCache<T> {
	private cacheFileName: string;
	private initLoad: Promise<void>

	private cache: Record<string, T>;

	constructor(fileName: string, defaultValue: Record<string, T> = {}) {
		// Stores cache in a .cache folder in your project root
		this.cacheFileName = join(process.cwd(), '.cache_' + fileName + '.json');
		this.cache = defaultValue;
		this.initLoad = this.loadFromDisk();
	}

	private async loadFromDisk() {
		if (await this.fileExists(this.cacheFileName)) {
			this.cache = JSON.parse((await readFile(this.cacheFileName)).toString());
		}
	}

	/**
	 * Get data from disk. Returns null if expired or missing.
	 */
	async get(key: string): Promise<T | null> {
		await this.initLoad;
		return key in this.cache ? this.cache[key] : null;
	}


	async set(key: string, value: T): Promise<T> {
		this.cache[key] = value
		await writeFile(this.cacheFileName, JSON.stringify(this.cache, null, 2));
		return value
	}

	async fileExists(path: string): Promise<boolean> {
		try {
			await stat(path);
			return true;
		} catch {
			return false;
		}
	};

}
