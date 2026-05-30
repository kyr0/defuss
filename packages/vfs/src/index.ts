import { dirnameVfsPath, joinVfsPath, MemoryVfs, normalizeVfsPath, type VfsInput } from './vfs.js';

export class WebVfsHostAdapter {
	public readonly env: Readonly<Record<string, string | undefined>>;
	public readonly argv: readonly string[];
	public stdout = '';
	public stderr = '';

	public constructor(vfs: MemoryVfs | VfsInput = new MemoryVfs(), options: { argv?: readonly string[]; env?: Readonly<Record<string, string | undefined>> } = {}) {
		this.vfs = vfs instanceof MemoryVfs ? vfs : new MemoryVfs(vfs);
		this.argv = options.argv ?? [];
		this.env = options.env ?? {};
	}

	private readonly vfs: MemoryVfs;

	public static fromInput(files: VfsInput, options: { argv?: readonly string[]; env?: Readonly<Record<string, string | undefined>> } = {}): WebVfsHostAdapter {
		return new WebVfsHostAdapter(files, options);
	}

	public exists(path: string): boolean { return this.vfs.exists(path); }
	public readText(path: string): string { return this.vfs.readText(path); }
	public readBytes(path: string): Uint8Array { return this.vfs.readBytes(path); }
	public writeText(path: string, content: string): void { this.vfs.writeText(path, content); }
	public writeBytes(path: string, bytes: Uint8Array): void { this.vfs.writeBytes(path, bytes); }
	public appendText(path: string, content: string): void { this.writeText(path, this.readText(path) + content); }
	public remove(path: string): void { this.vfs.remove(path); }
	public mkdir(path: string): void { this.vfs.mkdir(path); }
	public rename(from: string, to: string): void { this.vfs.rename(from, to); }
	public cwd(): string { return '/'; }
	public readdirCount(path: string): number { return this.vfs.readdirCount(path); }
	public readdirName(path: string, index: number): string | undefined { return this.vfs.readdirName(path, index); }
	public stat(path: string) { return this.vfs.stat(path); }
	public statSize(path: string): number { return this.vfs.stat(path).size; }
	public pathJoin(a: string, b: string): string { return joinVfsPath(a, b); }
	public pathAbsolute(path: string): string { return normalizeVfsPath(path.startsWith('/') ? path : `/${path}`); }
	public pathNormalize(path: string): string { return normalizeVfsPath(path); }
	public pathDirname(path: string): string { return dirnameVfsPath(path); }
	public pathBasename(path: string): string { const n = normalizeVfsPath(path); /* istanbul ignore next */ return n.split('/').at(-1) ?? n; }
	public pathExt(path: string): string { const base = this.pathBasename(path); const idx = base.lastIndexOf('.'); return idx >= 0 ? base.slice(idx) : ''; }
	public writeStdout(text: string): void { this.stdout += text; }
	public writeStderr(text: string): void { this.stderr += text; }
	public exit(_code: number): void { }
	public nowNs(): bigint { return 0n; }
	public runtimeInfo() { return { kind: 'web' as const, hosted: true, hasFs: true, hasTime: true, hasCrypto: false, hasEnv: true, hasProcess: false }; }
}
