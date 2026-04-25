const VARIANCE_FLOOR = 1e-20;

export class FireRedCmvnStats {
	constructor(
		public readonly means: Float32Array,
		public readonly invStds: Float32Array,
	) { }

	static fromKaldiBinary(data: Uint8Array): FireRedCmvnStats {
		if (data.byteLength < 15) {
			throw new Error("CMVN file too small");
		}

		const binaryMarker = data.indexOf(0x42);
		if (binaryMarker < 0) {
			throw new Error("CMVN: no binary marker 'B' found");
		}

		let offset = binaryMarker + 1;
		if (offset >= data.byteLength) {
			throw new Error("CMVN: truncated after 'B'");
		}

		const typeMarker = data[offset];
		if (typeMarker === undefined) {
			throw new Error("CMVN: truncated at type marker");
		}
		offset++;
		const isDouble =
			typeMarker === 0x44 ? true : typeMarker === 0x46 ? false : null;
		if (isDouble === null) {
			throw new Error(
				`CMVN: unexpected type marker '${String.fromCharCode(typeMarker)}'`,
			);
		}

		if (offset >= data.byteLength || data[offset] !== 0x4d) {
			throw new Error("CMVN: expected 'M' marker");
		}
		offset++;

		if (offset < data.byteLength && data[offset] === 0x20) {
			offset++;
		}

		if (offset + 5 > data.byteLength) {
			throw new Error("CMVN: truncated at rows");
		}
		offset++;
		const rows = readInt32LE(data, offset);
		offset += 4;
		if (rows !== 2) {
			throw new Error(`CMVN: expected 2 rows, got ${rows}`);
		}

		if (offset + 5 > data.byteLength) {
			throw new Error("CMVN: truncated at cols");
		}
		offset++;
		const cols = readInt32LE(data, offset);
		offset += 4;
		if (cols < 2) {
			throw new Error(`CMVN: expected cols >= 2, got ${cols}`);
		}

		const dim = cols - 1;
		const elemSize = isDouble ? 8 : 4;
		const totalElements = 2 * cols;
		if (offset + totalElements * elemSize > data.byteLength) {
			throw new Error(`CMVN: file too small for ${totalElements} elements`);
		}

		const row0Offset = offset;
		const row1Offset = offset + cols * elemSize;
		const count = readFloatValue(data, row0Offset + dim * elemSize, isDouble);
		if (count < 1) {
			throw new Error(`CMVN: count must be >= 1, got ${count}`);
		}

		const means = new Float32Array(dim);
		const invStds = new Float32Array(dim);

		for (let index = 0; index < dim; index++) {
			const sum = readFloatValue(data, row0Offset + index * elemSize, isDouble);
			const sumSquares = readFloatValue(
				data,
				row1Offset + index * elemSize,
				isDouble,
			);

			const mean = sum / count;
			const variance = Math.max(
				VARIANCE_FLOOR,
				sumSquares / count - mean * mean,
			);

			means[index] = mean;
			invStds[index] = 1 / Math.sqrt(variance);
		}

		return new FireRedCmvnStats(means, invStds);
	}

	normalize(features: Float32Array): void {
		for (let index = 0; index < features.length; index++) {
			features[index] =
				(features[index]! - this.means[index]!) * this.invStds[index]!;
		}
	}
}

function readInt32LE(data: Uint8Array, offset: number): number {
	return new DataView(
		data.buffer,
		data.byteOffset + offset,
		4,
	).getInt32(0, true);
}

function readFloatValue(
	data: Uint8Array,
	offset: number,
	isDouble: boolean,
): number {
	const view = new DataView(
		data.buffer,
		data.byteOffset + offset,
		isDouble ? 8 : 4,
	);
	return isDouble ? view.getFloat64(0, true) : view.getFloat32(0, true);
}
