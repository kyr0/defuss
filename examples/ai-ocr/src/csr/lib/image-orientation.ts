/**
 * Reads EXIF orientation from JPEG/PNG image files and corrects rotation
 * by re-rendering on a canvas with the proper transform applied.
 */

/**
 * EXIF Orientation tag values (0x0112):
 *  1 = Normal          2 = Flipped H
 *  3 = Rotated 180°    4 = Flipped V
 *  5 = Rotated 90° CW + Flipped H
 *  6 = Rotated 90° CW  7 = Rotated 90° CCW + Flipped H
 *  8 = Rotated 90° CCW
 */

/** Read EXIF orientation from a JPEG file. Returns 1 (normal) if not found. */
export async function readExifOrientation(file: File): Promise<number> {
	const buffer = await file.arrayBuffer();
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// JPEG SOI marker
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;

	let offset = 2;
	while (offset < bytes.length - 1) {
		// Find next marker
		if (bytes[offset] !== 0xff) break;
		offset++;

		const marker = bytes[offset];
		offset++;

		// Skip non-APP markers and padding
		if (marker === 0xff) continue; // padding
		if (marker === 0xd8 || marker === 0xd9) break; // SOI / EOI
		if (marker >= 0xd0 && marker <= 0xd7) continue; // RSTn

		// Read segment length
		if (offset + 2 > bytes.length) break;
		const segmentLength = view.getUint16(offset);
		offset += 2;

		// Only APP1 can contain EXIF
		if (marker !== 0xe1) {
			offset += segmentLength - 2;
			continue;
		}

		// Check for "Exif\0\0" at start of APP1 payload
		if (
			bytes[offset] === 0x45 &&
			bytes[offset + 1] === 0x78 &&
			bytes[offset + 2] === 0x69 &&
			bytes[offset + 3] === 0x66 &&
			bytes[offset + 4] === 0x00 &&
			bytes[offset + 5] === 0x00
		) {
			const tiffOffset = offset + 6;

			// Byte order: "II" = little-endian, "MM" = big-endian
			const littleEndian = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;

			// Magic number must be 42
			const magic = littleEndian
				? view.getUint16(tiffOffset + 2)
				: view.getUint16(tiffOffset + 2, true); // swap
			if (magic !== 42) return 1;

			// IFD offset
			const ifdOffset = littleEndian
				? view.getUint32(tiffOffset + 4)
				: view.getUint32(tiffOffset + 4, true);

			const ifdPtr = tiffOffset + ifdOffset;

			// Number of IFD entries
			const numEntries = littleEndian
				? view.getUint16(ifdPtr)
				: view.getUint16(ifdPtr, true);

			for (let i = 0; i < numEntries; i++) {
				const entryPtr = ifdPtr + 2 + i * 12;
				const tag = littleEndian
					? view.getUint16(entryPtr)
					: view.getUint16(entryPtr, true);

				// Orientation tag = 0x0112
				if (tag === 0x0112) {
					const value = littleEndian
						? view.getUint16(entryPtr + 8)
						: view.getUint16(entryPtr + 8, true);
					return value;
				}
			}
		}

		offset += segmentLength - 2;
	}

	return 1;
}

/**
 * Correct image orientation by drawing it on a canvas with the proper
 * rotation/flip transform, then returning the result as a new File (PNG).
 */
export async function correctImageOrientation(
	file: File,
	orientation: number,
): Promise<File> {
	if (orientation === 1) return file;

	return new Promise((resolve, reject) => {
		const img = new Image();
		const objUrl = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(objUrl);
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d")!;

			const w = img.naturalWidth;
			const h = img.naturalHeight;

			// Orientations 5, 6, 7, 8 swap width/height
			if ([5, 6, 7, 8].includes(orientation)) {
				canvas.width = h;
				canvas.height = w;
			} else {
				canvas.width = w;
				canvas.height = h;
			}

			switch (orientation) {
				case 1:
					ctx.drawImage(img, 0, 0);
					break;
				case 2:
					ctx.translate(w, 0);
					ctx.scale(-1, 1);
					ctx.drawImage(img, 0, 0);
					break;
				case 3:
					ctx.translate(w, h);
					ctx.rotate(Math.PI);
					ctx.drawImage(img, 0, 0);
					break;
				case 4:
					ctx.translate(0, h);
					ctx.scale(1, -1);
					ctx.drawImage(img, 0, 0);
					break;
				case 5:
					ctx.translate(h, 0);
					ctx.rotate(-Math.PI / 2);
					ctx.scale(-1, 1);
					ctx.drawImage(img, 0, 0);
					break;
				case 6:
					ctx.translate(h, 0);
					ctx.rotate(-Math.PI / 2);
					ctx.drawImage(img, 0, 0);
					break;
				case 7:
					ctx.rotate(Math.PI / 2);
					ctx.scale(-1, 1);
					ctx.drawImage(img, 0, 0);
					break;
				case 8:
					ctx.rotate(Math.PI / 2);
					ctx.drawImage(img, 0, 0);
					break;
			}

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Canvas toBlob returned null"));
						return;
					}
					// Keep original extension but output as PNG (canvas output)
					const name = file.name.replace(/\.[^.]+$/, ".png");
					resolve(new File([blob], name, { type: "image/png" }));
				},
				"image/png",
				1,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(objUrl);
			reject(new Error(`Failed to load image for orientation correction: ${file.name}`));
		};

		img.src = objUrl;
	});
}

/**
 * High-level helper: reads EXIF orientation for JPEG files and corrects
 * the image if needed. For non-JPEG files, returns the original file.
 */
export async function correctFileOrientation(file: File): Promise<File> {
	if (file.type !== "image/jpeg") return file;

	const orientation = await readExifOrientation(file);
	console.log(`[EXIF] ${file.name}: orientation = ${orientation}`);

	if (orientation === 1) return file;

	console.log(`[EXIF] Correcting orientation ${orientation} for ${file.name}`);
	return correctImageOrientation(file, orientation);
}

/**
 * Rotates an image 90° clockwise, baking the rotation into pixel data.
 * Returns a new File as PNG.
 */
export async function rotateImage90CW(file: File): Promise<File> {
	return rotateImage(file, 90);
}

/**
 * Rotates an image 90° counter-clockwise, baking the rotation into pixel data.
 * Returns a new File as PNG.
 */
export async function rotateImage90CCW(file: File): Promise<File> {
	return rotateImage(file, -90);
}

/**
 * Internal: rotates an image by +90 (clockwise) or -90 (counter-clockwise) degrees on a canvas.
 */
async function rotateImage(file: File, degrees: 90 | -90): Promise<File> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const objUrl = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(objUrl);
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d")!;

			const w = img.naturalWidth;
			const h = img.naturalHeight;

			// Swap dimensions for 90° rotation
			canvas.width = h;
			canvas.height = w;

			if (degrees === 90) {
				// Clockwise: translate to (h, 0) then rotate 90° CW
				ctx.translate(h, 0);
				ctx.rotate(Math.PI / 2);
				ctx.drawImage(img, 0, 0);
			} else {
				// Counter-clockwise: translate to (0, w) then rotate 90° CCW
				ctx.translate(0, w);
				ctx.rotate(-Math.PI / 2);
				ctx.drawImage(img, 0, 0);
			}

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Canvas toBlob returned null"));
						return;
					}
					const name = file.name.replace(/\.[^.]+$/, ".png");
					resolve(new File([blob], name, { type: "image/png" }));
				},
				"image/png",
				1,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(objUrl);
			reject(new Error(`Failed to load image for rotation: ${file.name}`));
		};

		img.src = objUrl;
	});
}
