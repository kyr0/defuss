/**
 * LightningImg - WebAssembly Image Converter
 * A fast, transparent, and safe image converter using WebAssembly
 */

// Detect environment and load appropriate WASM module
let wasmModule;
let isInitialized = false;
let initPromise = null;

async function ensureWasmInitialized() {
	if (isInitialized) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			// Try Node.js version first (CommonJS style)
			wasmModule = await import(
				"./lightningimg-wasm/pkg-node/lightningimg_wasm.js"
			);
			isInitialized = true;
			console.log("✅ Loaded Node.js WASM module");
		} catch (nodeError) {
			try {
				// Fallback to web version
				const webModule = await import(
					"./lightningimg-wasm/pkg/lightningimg_wasm.js"
				);
				await webModule.default(); // Initialize web version
				wasmModule = webModule;
				isInitialized = true;
				console.log("✅ Loaded Web WASM module");
			} catch (webError) {
				throw new Error(
					`Failed to load WASM module: Node.js (${nodeError.message}), Web (${webError.message})`,
				);
			}
		}
	})();

	await initPromise;
}

/**
 * Convert image buffer to WebP format with optional resizing
 * @param {Uint8Array} buffer - Input image buffer
 * @param {number|null} width - Target width (optional, maintains aspect ratio if height not specified)
 * @param {number|null} height - Target height (optional, maintains aspect ratio if width not specified)
 * @returns {Promise<Uint8Array>} - Converted image buffer
 */
export async function convertImageBuffer(buffer, width = null, height = null) {
	await ensureWasmInitialized();
	return wasmModule.convert_image_buffer(buffer, width, height);
}

/**
 * Check if an image format is supported
 * @param {Uint8Array} buffer - Input image buffer
 * @returns {Promise<boolean>} - True if format is supported
 */
export async function isSupportedFormat(buffer) {
	await ensureWasmInitialized();
	return wasmModule.is_supported_format(buffer);
}

/**
 * Get information about an image
 * @param {Uint8Array} buffer - Input image buffer
 * @returns {Promise<Object>} - Image information
 */
export async function getImageInfo(buffer) {
	await ensureWasmInitialized();
	const info = wasmModule.get_image_info(buffer);
	// Handle both JSON string and object returns
	if (typeof info === "string") {
		return JSON.parse(info);
	}
	return info;
}

// Export default object with all functions for CommonJS compatibility
export default {
	convertImageBuffer,
	isSupportedFormat,
	getImageInfo,
};
