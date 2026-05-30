export interface VfsImageIndexEntry {
	readonly path: string;
	readonly offset: number;
	readonly length: number;
}

export interface VfsStat {
	readonly exists: boolean;
	readonly isFile: boolean;
	readonly isDir: boolean;
	readonly size: number;
}

export type VfsInput = Record<string, string | Uint8Array> | Map<string, string | Uint8Array> | Iterable<readonly [string, string | Uint8Array]>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAGIC = encoder.encode('GVFS');
const VERSION = 1;
const HEADER_PREFIX_BYTES = 9;

export function normalizeVfsPath(path: string): string {
	const absolute = path.startsWith('/');
	const stack: string[] = [];
	for (const part of path.replace(/\\/g, '/').split('/')) {
		if (!part || part === '.') continue;
		if (part === '..') stack.pop(); else stack.push(part);
	}
	// istanbul ignore next
	return `${absolute ? '/' : ''}${stack.join('/')}` || (absolute ? '/' : '.');
}

export function dirnameVfsPath(path: string): string {
	const normalized = normalizeVfsPath(path);
	if (normalized === '/' || normalized === '.') return normalized;
	const parts = normalized.split('/');
	parts.pop();
	// istanbul ignore next
	if (parts.length === 0) return normalized.startsWith('/') ? '/' : '.';
	if (parts.length === 1 && parts[0] === '') return '/';
	// istanbul ignore next
	return parts.join('/') || '.';
}

export function joinVfsPath(...parts: string[]): string {
	return normalizeVfsPath(parts.join('/'));
}

function iterInput(input: VfsInput): Iterable<readonly [string, string | Uint8Array]> {
	if (input instanceof Map) return input.entries();
	if (typeof (input as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function' && (input as object).constructor !== Object) {
		return input as Iterable<readonly [string, string | Uint8Array]>;
	}
	return Object.entries(input as Record<string, string | Uint8Array>);
}

function toBytes(value: string | Uint8Array): Uint8Array {
	return typeof value === 'string' ? encoder.encode(value) : value;
}

export class MemoryVfs {
	private readonly files = new Map<string, Uint8Array>();
	private readonly dirs = new Set<string>(['/', '.']);

	public constructor(initial: VfsInput = {}) {
		for (const [path, value] of iterInput(initial)) this.writeBytes(path, toBytes(value));
	}

	public clone(): MemoryVfs {
		return new MemoryVfs(this.entries());
	}

	public entries(): Iterable<readonly [string, Uint8Array]> {
		return [...this.files.entries()].sort(([a], [b]) => a.localeCompare(b));
	}

	public listPaths(): readonly string[] {
		return [...this.files.keys()].sort((a, b) => a.localeCompare(b));
	}

	public exists(path: string): boolean {
		const normalized = normalizeVfsPath(path);
		return this.files.has(normalized) || this.dirs.has(normalized);
	}

	public readBytes(path: string): Uint8Array {
		const normalized = normalizeVfsPath(path);
		const value = this.files.get(normalized);
		if (value === undefined) throw new Error(`Missing virtual source '${normalized}'.`);
		return value;
	}

	public readText(path: string): string {
		return decoder.decode(this.readBytes(path));
	}

	public writeBytes(path: string, bytes: Uint8Array): void {
		const normalized = normalizeVfsPath(path);
		const stable = new Uint8Array(bytes);
		this.files.set(normalized, stable);
		this.ensureDirs(normalized);
	}

	public writeText(path: string, text: string): void {
		this.writeBytes(path, encoder.encode(text));
	}

	public remove(path: string): void {
		const normalized = normalizeVfsPath(path);
		if (!this.exists(normalized)) throw new Error(`Missing virtual path '${normalized}'.`);
		this.files.delete(normalized);
		this.dirs.delete(normalized);
	}

	public mkdir(path: string): void {
		this.ensureDirs(normalizeVfsPath(path), true);
	}

	public rename(from: string, to: string): void {
		const src = normalizeVfsPath(from);
		const dst = normalizeVfsPath(to);
		const value = this.readBytes(src);
		this.files.delete(src);
		this.writeBytes(dst, value);
	}

	public readdirNames(path: string): readonly string[] {
		const dir = normalizeVfsPath(path);
		if (!this.dirs.has(dir)) return [];
		const names = new Set<string>();
		const addChild = (candidate: string): void => {
			if (candidate === dir) return;
			const parent = dirnameVfsPath(candidate);
			if (parent !== dir) return;
			const name = candidate.split('/').at(-1);
			// istanbul ignore next
			if (name) names.add(name);
		};
		for (const candidate of this.files.keys()) addChild(candidate);
		for (const candidate of this.dirs) addChild(candidate);
		return [...names].sort((a, b) => a.localeCompare(b));
	}

	public readdirName(path: string, index: number): string | undefined {
		if (!Number.isInteger(index) || index < 0) return undefined;
		return this.readdirNames(path)[index];
	}

	public readdirCount(path: string): number {
		return this.readdirNames(path).length;
	}

	public stat(path: string): VfsStat {
		const normalized = normalizeVfsPath(path);
		const file = this.files.get(normalized);
		if (file) return { exists: true, isFile: true, isDir: false, size: file.byteLength };
		const isDir = this.dirs.has(normalized);
		return { exists: isDir, isFile: false, isDir, size: isDir ? 0 : -1 };
	}

	public overlay(other: VfsInput): MemoryVfs {
		const next = this.clone();
		for (const [path, value] of iterInput(other)) next.writeBytes(path, toBytes(value));
		return next;
	}

	private ensureDirs(path: string, includeSelf = false): void {
		let current = includeSelf ? normalizeVfsPath(path) : dirnameVfsPath(path);
		while (current && current !== '.' && !this.dirs.has(current)) {
			this.dirs.add(current);
			const parent = dirnameVfsPath(current);
			// istanbul ignore next
			if (parent === current) break;
			current = parent;
		}
		this.dirs.add('.');
		this.dirs.add('/');
	}
}

export function parseVfsImage(bytes: Uint8Array | ArrayBuffer): readonly VfsImageIndexEntry[] {
	const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	if (data.byteLength < HEADER_PREFIX_BYTES) throw new Error('Invalid VFS image: truncated header.');
	for (let i = 0; i < MAGIC.length; i += 1) if (data[i] !== MAGIC[i]) throw new Error('Invalid VFS image: bad magic.');
	if (data[4] !== VERSION) throw new Error(`Unsupported VFS image version '${data[4]}'.`);
	const headerLength = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(5, true);
	const headerStart = HEADER_PREFIX_BYTES;
	const headerEnd = headerStart + headerLength;
	if (headerEnd > data.byteLength) throw new Error('Invalid VFS image: truncated index.');
	const raw = JSON.parse(decoder.decode(data.slice(headerStart, headerEnd))) as readonly [string, number, number][];
	return raw.map(([path, offset, length]) => ({ path, offset, length }));
}

export function unpackVfsImage(bytes: Uint8Array | ArrayBuffer): MemoryVfs {
	const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	const files = new Map<string, Uint8Array>();
	for (const entry of parseVfsImage(data)) files.set(entry.path, data.slice(entry.offset, entry.offset + entry.length));
	return new MemoryVfs(files);
}

export function packVfsImage(input: VfsInput): Uint8Array<ArrayBuffer> {
	const entries = [...iterInput(input)].map(([path, value]) => ({ path: normalizeVfsPath(path), bytes: toBytes(value) })).sort((a, b) => a.path.localeCompare(b.path));
	let headerLength = 2;
	while (true) {
		let cursor = HEADER_PREFIX_BYTES + headerLength;
		const index = entries.map((entry) => {
			const current = [entry.path, cursor, entry.bytes.byteLength] as [string, number, number];
			cursor += entry.bytes.byteLength;
			return current;
		});
		const encoded = encoder.encode(JSON.stringify(index));
		if (encoded.byteLength === headerLength) {
			const out = new Uint8Array(new ArrayBuffer(HEADER_PREFIX_BYTES + encoded.byteLength + entries.reduce((sum, entry) => sum + entry.bytes.byteLength, 0)));
			out.set(MAGIC, 0);
			out[4] = VERSION;
			new DataView(out.buffer).setUint32(5, encoded.byteLength, true);
			out.set(encoded, HEADER_PREFIX_BYTES);
			let payloadCursor = HEADER_PREFIX_BYTES + encoded.byteLength;
			for (const entry of entries) {
				out.set(entry.bytes, payloadCursor);
				payloadCursor += entry.bytes.byteLength;
			}
			return out;
		}
		headerLength = encoded.byteLength;
	}
}
