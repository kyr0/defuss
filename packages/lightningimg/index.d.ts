/**
 * LightningImg - WebAssembly Image Converter TypeScript Definitions
 */

/**
 * Convert image buffer to WebP format with optional resizing
 * @param buffer - Input image buffer
 * @param width - Target width (optional, maintains aspect ratio if height not specified)
 * @param height - Target height (optional, maintains aspect ratio if width not specified)
 * @returns Promise resolving to converted image buffer
 */
export function convertImageBuffer(
	buffer: Uint8Array,
	width?: number | null,
	height?: number | null,
): Promise<Uint8Array>;

/**
 * Check if an image format is supported
 * @param buffer - Input image buffer
 * @returns Promise resolving to true if format is supported
 */
export function isSupportedFormat(buffer: Uint8Array): Promise<boolean>;

/**
 * Get information about an image
 * @param buffer - Input image buffer
 * @returns Promise resolving to image information
 */
export function getImageInfo(buffer: Uint8Array): Promise<{
	width: number;
	height: number;
	format: string;
	size: number;
}>;

/**
 * Default export with all functions
 */
declare const _default: {
	convertImageBuffer: typeof convertImageBuffer;
	isSupportedFormat: typeof isSupportedFormat;
	getImageInfo: typeof getImageInfo;
};

export default _default;
