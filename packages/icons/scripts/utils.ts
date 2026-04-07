import {mkdir, writeFile, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {optimize, PluginConfig} from 'svgo';
import sharp from 'sharp';
/**
 * Fetches content from a URL and returns it as a Arraybuffer.
 * Throws an exception if the HTTP request fails.
 */
export const fetchAsArrayBuffer = async (input: string | URL | Request,
                                  init?: RequestInit): Promise<ArrayBuffer> => {
	const response = await fetch(input, init);

	if (!response.ok) {
		// Standardizing the exception throwing
		throw new Error(`Failed to fetch ${response.url}: ${response.status} ${response.statusText}`);
	}

	return await response.arrayBuffer();
}
/**
 * Fetches content from a URL and returns it as a string.
 * Throws an exception if the HTTP request fails.
 */
export const fetchAsText = async (input: string | URL | Request,
                                  init?: RequestInit): Promise<string> => {
	
	return Buffer.from(await fetchAsArrayBuffer(input, init)).toString("utf8");
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
export const optimizeSvg = (svgString: string, plugins: PluginConfig[]): string => {
	const result = optimize(svgString, {
		multipass: true, // optimize multiple times for smallest size
		plugins: [
			'preset-default',
			...plugins
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

/**
 * Capitalizes the first character of a string.
 */
export const capitalize = (str: string): string => {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Pushes an item into an array only if it doesn't already exist.
 * Returns true if added, false if skipped.
 */
export const pushUnique = <T>(array: T[], item: T): boolean => {
	if (!array.includes(item)) {
		array.push(item);
		return true;
	}
	return false;
};


/**
 * Safely finds the maximum number in a very large array.
 */
export const findMaxSafe = (numbers: number[]): number => {
	return numbers.reduce((max, current) => (current > max ? current : max), -Infinity);
};


export const batchProcessing = async <T>(batchSize: number = 500, elements: Array<T>, transform: (element: T) => Promise<void>): Promise<number> => {

	const chunkElements = chunkArray(elements as Array<T>, batchSize);
	console.log(`📂 Processing ${chunkElements.length} batches of ${batchSize}...`);
	let processedCount = 0;
	const totalStartTime = performance.now();

	for await (const [index, elementChunk] of chunkElements.entries()) {
		process.stdout.write(`\r⏳ Batch ${index + 1}/${chunkElements.length} Total: ${processedCount}`);
		try {
			await Promise.all(elementChunk.map(async (element) => {
				await transform(element)
				processedCount++;
			}))
		} catch (error) {
			console.error(`\n❌ Error in Batch ${index + 1}:`, error instanceof Error ? error.message : error);
			// We don't 'throw' here if you want the other batches to continue
		}
	}
	console.log(`\n✨ Finished! ${processedCount} in ${((performance.now() - totalStartTime) / 1000).toFixed(2)}s`)

	return processedCount
}

export async function svgBufferToPng(svgString: string, outputPath: string, size: number) {
	const buffer = Buffer.from(svgString);
	const outputPathParts = outputPath.split('/');
	outputPathParts.pop();
	const subPath = outputPathParts.join('/')
	await ensureDir(subPath);

	await sharp(buffer)
		.resize(size, size)
		.png()
		.toFile(outputPath);
}
