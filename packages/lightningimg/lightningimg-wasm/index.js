const wasmModule = require("./pkg/lightningimg_wasm.js");

// Global state
let wasmInitialized = false;
let fs = null;
let path = null;

// Initialize WASM module
async function initWasm() {
	if (!wasmInitialized) {
		await init();
		init_panic_hook();
		wasmInitialized = true;
	}
}

// Try to load Node.js modules if available
function loadNodeModules() {
	try {
		if (typeof require !== "undefined") {
			fs = require("node:fs");
			path = require("node:path");
		} else if (
			typeof process !== "undefined" &&
			process.versions &&
			process.versions.node
		) {
			// In ES modules environment, try dynamic import
			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
			import("node:fs").then((fsModule) => (fs = fsModule));
			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
			import("node:path").then((pathModule) => (path = pathModule));
		}
	} catch (e) {
		// Running in browser or environment without fs access
		fs = null;
		path = null;
	}
}

// Load Node.js modules on initialization
loadNodeModules();

/**
 * Convert an image buffer to WebP format
 * @param {Uint8Array} buffer - Input image buffer
 * @returns {Promise<Uint8Array>} - WebP encoded buffer
 */
export async function convertImageBuffer(buffer) {
	await initWasm();
	return convert_image_buffer(buffer);
}

/**
 * Convert an image buffer to WebP format with specified quality
 * @param {Uint8Array} buffer - Input image buffer
 * @param {number} quality - Quality (0-100)
 * @returns {Promise<Uint8Array>} - WebP encoded buffer
 */
export async function convertImageBufferWithQuality(buffer, quality = 100) {
	await initWasm();
	return convert_image_buffer_with_quality(buffer, quality);
}

/**
 * Check if an image format is supported
 * @param {Uint8Array} buffer - Image buffer to check
 * @returns {Promise<boolean>} - True if format is supported
 */
export async function isSupportedFormat(buffer) {
	await initWasm();
	return is_supported_format(buffer);
}

/**
 * Get image information from buffer
 * @param {Uint8Array} buffer - Image buffer
 * @returns {Promise<{format: string, width: number, height: number}>} - Image info
 */
export async function getImageInfo(buffer) {
	await initWasm();
	return get_image_info(buffer);
}

/**
 * Recursively process all images in a directory (Node.js only)
 * @param {string} inputDir - Input directory path
 * @param {string} [outputDir] - Output directory path (optional)
 */
export async function processDirectory(inputDir, outputDir) {
	if (!fs || !path) {
		throw new Error(
			"processDirectory is only available in Node.js environments with file system access",
		);
	}

	await initWasm();
	await processDirectoryInternal(inputDir, outputDir, false);
}

/**
 * Recursively process all images in a directory, optionally keeping original names (Node.js only)
 * @param {string} inputDir - Input directory path
 * @param {boolean} [keepOriginalNames=false] - Keep original file names
 */
export async function processDirectoryDestructive(
	inputDir,
	keepOriginalNames = false,
) {
	if (!fs || !path) {
		throw new Error(
			"processDirectoryDestructive is only available in Node.js environments with file system access",
		);
	}

	await initWasm();
	await processDirectoryInternal(inputDir, null, keepOriginalNames);
}

// Internal function to handle directory processing
async function processDirectoryInternal(inputDir, outputDir, keepOriginalExt) {
	const entries = fs.readdirSync(inputDir);

	const promises = entries.map(async (entry) => {
		const entryPath = path.join(inputDir, entry);
		const stats = fs.statSync(entryPath);

		if (stats.isFile() && isSupportedFile(entryPath)) {
			await convertImageFile(entryPath, outputDir, keepOriginalExt);
		} else if (stats.isDirectory()) {
			const nextOutputDir = outputDir ? path.join(outputDir, entry) : null;
			if (nextOutputDir && !fs.existsSync(nextOutputDir)) {
				fs.mkdirSync(nextOutputDir, { recursive: true });
			}
			await processDirectoryInternal(entryPath, nextOutputDir, keepOriginalExt);
		}
	});

	await Promise.all(promises);
}

// Convert a single image file
async function convertImageFile(inputPath, outputDir, keepOriginalExt) {
	const inputBuffer = fs.readFileSync(inputPath);
	const webpBuffer = await convert_image_buffer(inputBuffer);

	let outputPath;
	if (keepOriginalExt) {
		outputPath = outputDir
			? path.join(outputDir, path.basename(inputPath))
			: inputPath;
	} else {
		const baseName = path.parse(inputPath).name;
		outputPath = outputDir
			? path.join(outputDir, `${baseName}.webp`)
			: path.join(path.dirname(inputPath), `${baseName}.webp`);
	}

	// Ensure output directory exists
	const outputDirPath = path.dirname(outputPath);
	if (!fs.existsSync(outputDirPath)) {
		fs.mkdirSync(outputDirPath, { recursive: true });
	}

	fs.writeFileSync(outputPath, webpBuffer);
	console.log(`Generated: ${outputPath}`);
}

// Check if file extension is supported
function isSupportedFile(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	return [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif"].includes(ext);
}

// For browser environments, expose a file processing function
/**
 * Convert a File object to WebP (browser only)
 * @param {File} file - File object from input element
 * @returns {Promise<Uint8Array>} - WebP encoded buffer
 */
export async function convertFile(file) {
	if (typeof File === "undefined") {
		throw new Error("convertFile is only available in browser environments");
	}

	await initWasm();

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const buffer = new Uint8Array(e.target.result);
				const webpBuffer = await convert_image_buffer(buffer);
				resolve(webpBuffer);
			} catch (error) {
				reject(error);
			}
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsArrayBuffer(file);
	});
}

// Initialize the module
export { init as initWasm };

// Export everything for CommonJS compatibility
export default {
	convertImageBuffer,
	convertImageBufferWithQuality,
	isSupportedFormat,
	getImageInfo,
	processDirectory,
	processDirectoryDestructive,
	convertFile,
	initWasm,
};
