export declare function convertImageBuffer(
	buffer: Uint8Array,
): Promise<Uint8Array>;
export declare function convertImageBufferWithQuality(
	buffer: Uint8Array,
	quality?: number,
): Promise<Uint8Array>;
export declare function isSupportedFormat(buffer: Uint8Array): Promise<boolean>;
export declare function getImageInfo(buffer: Uint8Array): Promise<{
	format: string;
	width: number;
	height: number;
}>;

/** Processes all images in a directory recursively, converting them to WebP format. (Node.js only) */
export declare function processDirectory(
	inputDir: string,
	outputDir?: string,
): Promise<void>;

/** Processes all images in a directory recursively, converting them to WebP format and optionally keeping original file names. (Node.js only) */
export declare function processDirectoryDestructive(
	inputDir: string,
	keepOriginalNames?: boolean,
): Promise<void>;

/** Convert a File object to WebP (browser only) */
export declare function convertFile(file: File): Promise<Uint8Array>;

/** Initialize the WASM module */
export declare function initWasm(): Promise<void>;

declare const _default: {
	convertImageBuffer: typeof convertImageBuffer;
	convertImageBufferWithQuality: typeof convertImageBufferWithQuality;
	isSupportedFormat: typeof isSupportedFormat;
	getImageInfo: typeof getImageInfo;
	processDirectory: typeof processDirectory;
	processDirectoryDestructive: typeof processDirectoryDestructive;
	convertFile: typeof convertFile;
	initWasm: typeof initWasm;
};

export default _default;
