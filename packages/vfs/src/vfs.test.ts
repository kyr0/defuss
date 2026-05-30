import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { WebVfsHostAdapter } from './index.js';
import { dirnameVfsPath, joinVfsPath, MemoryVfs, normalizeVfsPath, packVfsImage, parseVfsImage, unpackVfsImage, type VfsInput } from './vfs.js';

interface Fixture {
  readonly entries: readonly [string, string][];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(__dirname, 'vfs.fixture.json'), 'utf8'),
) as Fixture;

describe('VFS image', () => {
  test('round-trips a flat index and payload bytes', () => {
    const image = packVfsImage(new Map(fixture.entries));
    const index = parseVfsImage(image);
    expect(index.map((entry) => entry.path)).toEqual(
      fixture.entries.map(([path]) => path),
    );
    const vfs = unpackVfsImage(image);
    for (const [path, text] of fixture.entries) {
      expect(vfs.readText(path)).toBe(text);
    }
  });

  test('throws on truncated header', () => {
    expect(() => parseVfsImage(new Uint8Array([0, 1, 2]))).toThrow('Invalid VFS image: truncated header.');
  });

  test('throws on bad magic', () => {
    const bad = new Uint8Array(100);
    bad.set([0x58, 0x58, 0x58, 0x58], 0); // XXXX instead of GVFS
    expect(() => parseVfsImage(bad)).toThrow('Invalid VFS image: bad magic.');
  });

  test('throws on unsupported version', () => {
    const img = packVfsImage({ '/a.txt': 'x' });
    img[4] = 99; // corrupt version
    expect(() => parseVfsImage(img)).toThrow("Unsupported VFS image version '99'.");
  });

  test('throws on truncated index', () => {
    const img = packVfsImage({ '/a.txt': 'x' });
    const truncated = img.slice(0, 15); // chop off index JSON
    expect(() => parseVfsImage(truncated)).toThrow('Invalid VFS image: truncated index.');
  });

  test('parseVfsImage accepts ArrayBuffer', () => {
    const img = packVfsImage({ '/a.txt': 'hello' });
    const ab = img.buffer.slice(img.byteOffset, img.byteOffset + img.byteLength) as ArrayBuffer;
    const index = parseVfsImage(ab);
    expect(index[0].path).toBe('/a.txt');
  });

  test('unpackVfsImage accepts ArrayBuffer', () => {
    const img = packVfsImage({ '/a.txt': 'hello' });
    const ab = img.buffer.slice(img.byteOffset, img.byteOffset + img.byteLength) as ArrayBuffer;
    const vfs = unpackVfsImage(ab);
    expect(vfs.readText('/a.txt')).toBe('hello');
  });

  test('packVfsImage with Iterable input', () => {
    const entries: Iterable<readonly [string, string]> = function* () {
      yield ['/x.txt', 'x'];
      yield ['/y.txt', 'y'];
    }();
    const img = packVfsImage(entries);
    const vfs = unpackVfsImage(img);
    expect(vfs.readText('/x.txt')).toBe('x');
    expect(vfs.readText('/y.txt')).toBe('y');
  });

  test('packVfsImage with Map input', () => {
    const map = new Map<string, string>([
      ['/a.txt', 'aaa'],
      ['/b.txt', 'bbb'],
    ]);
    const img = packVfsImage(map);
    const vfs = unpackVfsImage(img);
    expect(vfs.readText('/a.txt')).toBe('aaa');
    expect(vfs.readText('/b.txt')).toBe('bbb');
  });

  test('packVfsImage with Uint8Array values', () => {
    const img = packVfsImage({ '/bin.dat': new Uint8Array([1, 2, 3]) });
    const vfs = unpackVfsImage(img);
    expect(vfs.readBytes('/bin.dat')).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe('MemoryVfs', () => {
  test('overlay and rename stay normalized', () => {
    const vfs = new MemoryVfs({ '/a/./b.txt': 'x' }).overlay({ '/a/c.txt': 'y' });
    vfs.rename('/a/c.txt', '/a/d.txt');
    expect(vfs.exists('/a/b.txt')).toBe(true);
    expect(vfs.readText('/a/d.txt')).toBe('y');
    expect(vfs.readdirCount('/a')).toBe(2);
    expect(vfs.readdirNames('/a')).toEqual(['b.txt', 'd.txt']);
    expect(vfs.readdirName('/a', 1)).toBe('d.txt');
  });

  test('README example: create, read, write, readdir, stat, remove, rename, clone, overlay', () => {
    // Create with initial files
    const vfs = new MemoryVfs({
      '/src/index.ts': "console.log('hello');",
      '/src/utils.ts': 'export const x = 1;',
      '/README.md': '# Project',
    });

    // Read
    expect(vfs.readText('/src/index.ts')).toBe("console.log('hello');");
    expect(vfs.readBytes('/src/index.ts')).toBeInstanceOf(Uint8Array);

    // Write
    vfs.writeText('/src/config.json', '{"debug": true}');
    vfs.writeBytes('/data.bin', new Uint8Array([1, 2, 3]));

    // Directory operations
    expect(vfs.readdirNames('/src')).toEqual(['config.json', 'index.ts', 'utils.ts']);
    expect(vfs.readdirCount('/src')).toBe(3);
    expect(vfs.stat('/src')).toEqual({ exists: true, isFile: false, isDir: true, size: 0 });
    expect(vfs.stat('/src/index.ts')).toEqual({
      exists: true,
      isFile: true,
      isDir: false,
      size: 21,
    });

    // Remove & rename
    vfs.remove('/src/config.json');
    vfs.rename('/src/utils.ts', '/src/helpers.ts');
    expect(vfs.exists('/src/config.json')).toBe(false);
    expect(vfs.exists('/src/helpers.ts')).toBe(true);

    // Clone & overlay
    const copy = vfs.clone();
    expect(copy.readText('/src/index.ts')).toBe("console.log('hello');");
    const merged = vfs.overlay({ '/new.txt': 'added' });
    expect(merged.readText('/new.txt')).toBe('added');
  });

  test('listPaths returns sorted file paths', () => {
    const vfs = new MemoryVfs({
      '/b.txt': 'b',
      '/a.txt': 'a',
      '/c/nested.txt': 'n',
    });
    expect(vfs.listPaths()).toEqual(['/a.txt', '/b.txt', '/c/nested.txt']);
  });

  test('entries returns sorted entries', () => {
    const vfs = new MemoryVfs({ '/z.txt': 'z', '/a.txt': 'a' });
    const entries = [...vfs.entries()];
    expect(entries.map(([p]) => p)).toEqual(['/a.txt', '/z.txt']);
  });

  test('mkdir creates explicit directories', () => {
    const vfs = new MemoryVfs();
    vfs.mkdir('/empty/dir');
    expect(vfs.stat('/empty')).toEqual({ exists: true, isFile: false, isDir: true, size: 0 });
    expect(vfs.stat('/empty/dir')).toEqual({ exists: true, isFile: false, isDir: true, size: 0 });
  });

  test('readBytes throws on missing file', () => {
    const vfs = new MemoryVfs();
    expect(() => vfs.readBytes('/missing.txt')).toThrow("Missing virtual source '/missing.txt'.");
  });

  test('remove throws on missing path', () => {
    const vfs = new MemoryVfs();
    expect(() => vfs.remove('/missing.txt')).toThrow("Missing virtual path '/missing.txt'.");
  });

  test('readdirNames returns empty for non-existent dir', () => {
    const vfs = new MemoryVfs({ '/a.txt': 'x' });
    expect(vfs.readdirNames('/nonexistent')).toEqual([]);
  });

  test('readdirName with invalid index returns undefined', () => {
    const vfs = new MemoryVfs({ '/a.txt': 'x' });
    expect(vfs.readdirName('/', -1)).toBe(undefined);
    expect(vfs.readdirName('/', 1.5)).toBe(undefined);
  });

  test('stat for non-existent path', () => {
    const vfs = new MemoryVfs();
    expect(vfs.stat('/nope')).toEqual({ exists: false, isFile: false, isDir: false, size: -1 });
  });

  test('constructor with Map input', () => {
    const vfs = new MemoryVfs(new Map([['/x.txt', 'x']]));
    expect(vfs.readText('/x.txt')).toBe('x');
  });

  test('constructor with Iterable input', () => {
    const vfs = new MemoryVfs(function* () {
      yield ['/y.txt', 'y'];
    }());
    expect(vfs.readText('/y.txt')).toBe('y');
  });

  test('constructor with empty input', () => {
    const vfs = new MemoryVfs();
    expect(vfs.listPaths()).toEqual([]);
  });
});

describe('WebVfsHostAdapter', () => {
  test('README example: fromInput, path utils, stdout', () => {
    const host = WebVfsHostAdapter.fromInput(
      { '/app/main.ts': "console.log('run');" },
      {
        argv: ['node', 'main.ts'],
        env: { NODE_ENV: 'production' },
      },
    );

    expect(host.readText('/app/main.ts')).toBe("console.log('run');");
    expect(host.pathJoin('/a', 'b/c')).toBe('/a/b/c');
    expect(host.pathDirname('/a/b/c.ts')).toBe('/a/b');
    expect(host.pathBasename('/a/b/c.ts')).toBe('c.ts');
    expect(host.pathExt('/a/b/c.ts')).toBe('.ts');

    host.writeStdout('hello\n');
    expect(host.stdout).toBe('hello\n');
  });

  test('constructor with MemoryVfs directly', () => {
    const vfs = new MemoryVfs({ '/a.txt': 'a' });
    const host = new WebVfsHostAdapter(vfs);
    expect(host.readText('/a.txt')).toBe('a');
  });

  test('constructor with default options', () => {
    const host = new WebVfsHostAdapter();
    expect(host.argv).toEqual([]);
    expect(host.env).toEqual({});
  });

  test('writeText and writeBytes', () => {
    const host = new WebVfsHostAdapter();
    host.writeText('/a.txt', 'hello');
    host.writeBytes('/b.bin', new Uint8Array([1, 2]));
    expect(host.readText('/a.txt')).toBe('hello');
    expect(host.readBytes('/b.bin')).toEqual(new Uint8Array([1, 2]));
  });

  test('appendText appends to existing content', () => {
    const host = new WebVfsHostAdapter({ '/a.txt': 'hello' });
    host.appendText('/a.txt', ' world');
    expect(host.readText('/a.txt')).toBe('hello world');
  });

  test('remove, mkdir, rename', () => {
    const host = new WebVfsHostAdapter({ '/a.txt': 'x' });
    host.rename('/a.txt', '/b.txt');
    expect(host.exists('/b.txt')).toBe(true);
    host.mkdir('/dir');
    expect(host.stat('/dir').isDir).toBe(true);
    host.remove('/b.txt');
    expect(host.exists('/b.txt')).toBe(false);
  });

  test('cwd returns /', () => {
    const host = new WebVfsHostAdapter();
    expect(host.cwd()).toBe('/');
  });

  test('statSize returns file size', () => {
    const host = new WebVfsHostAdapter({ '/a.txt': '12345' });
    expect(host.statSize('/a.txt')).toBe(5);
  });

  test('pathAbsolute normalizes relative paths', () => {
    const host = new WebVfsHostAdapter();
    expect(host.pathAbsolute('a/b')).toBe('/a/b');
    expect(host.pathAbsolute('/a/b')).toBe('/a/b');
  });

  test('pathNormalize normalizes paths', () => {
    const host = new WebVfsHostAdapter();
    expect(host.pathNormalize('/a/./b/../c')).toBe('/a/c');
  });

  test('pathBasename with no slash', () => {
    const host = new WebVfsHostAdapter();
    expect(host.pathBasename('file.txt')).toBe('file.txt');
  });

  test('pathExt with no extension', () => {
    const host = new WebVfsHostAdapter();
    expect(host.pathExt('/path/noext')).toBe('');
  });

  test('writeStderr', () => {
    const host = new WebVfsHostAdapter();
    host.writeStderr('error\n');
    expect(host.stderr).toBe('error\n');
  });

  test('exit does not throw', () => {
    const host = new WebVfsHostAdapter();
    expect(() => host.exit(42)).not.toThrow();
  });

  test('nowNs returns 0n', () => {
    const host = new WebVfsHostAdapter();
    expect(host.nowNs()).toBe(0n);
  });

  test('runtimeInfo returns correct shape', () => {
    const host = new WebVfsHostAdapter();
    expect(host.runtimeInfo()).toEqual({
      kind: 'web',
      hosted: true,
      hasFs: true,
      hasTime: true,
      hasCrypto: false,
      hasEnv: true,
      hasProcess: false,
    });
  });

  test('readdirCount and readdirName', () => {
    const host = new WebVfsHostAdapter({ '/a/x.txt': 'x', '/a/y.txt': 'y' });
    expect(host.readdirCount('/a')).toBe(2);
    expect(host.readdirName('/a', 0)).toBe('x.txt');
    expect(host.readdirName('/a', 1)).toBe('y.txt');
  });
});

describe('VFS Image Packing/Unpacking', () => {
  test('README example: pack, parse, unpack', () => {
    // Pack files into a binary image
    const image = packVfsImage({
      '/src/index.ts': 'export main();',
      '/src/lib.ts': 'export function main() {}',
    });

    // Parse index without extracting files
    const index = parseVfsImage(image);
    expect(index).toHaveLength(2);
    expect(index[0].path).toBe('/src/index.ts');
    expect(index[0].length).toBe(14);
    expect(index[1].path).toBe('/src/lib.ts');
    expect(index[1].length).toBe(25);

    // Unpack back to MemoryVfs
    const vfs = unpackVfsImage(image);
    expect(vfs.readText('/src/index.ts')).toBe('export main();');
    expect(vfs.readText('/src/lib.ts')).toBe('export function main() {}');
  });
});

describe('Path Utilities', () => {
  test('README example: normalize, dirname, join', () => {
    expect(normalizeVfsPath('/a/./b/../c')).toBe('/a/c');
    expect(dirnameVfsPath('/a/b/c.ts')).toBe('/a/b');
    expect(joinVfsPath('/a', 'b', 'c')).toBe('/a/b/c');
  });

  test('normalizeVfsPath with relative path', () => {
    expect(normalizeVfsPath('a/b/../c')).toBe('a/c');
  });

  test('normalizeVfsPath root returns /', () => {
    expect(normalizeVfsPath('/')).toBe('/');
  });

  test('normalizeVfsPath with backslashes', () => {
    expect(normalizeVfsPath('a\\b\\c')).toBe('a/b/c');
  });

  test('dirnameVfsPath root returns /', () => {
    expect(dirnameVfsPath('/')).toBe('/');
  });

  test('dirnameVfsPath relative returns .', () => {
    expect(dirnameVfsPath('.')).toBe('.');
  });

  test('dirnameVfsPath single segment', () => {
    expect(dirnameVfsPath('/file.txt')).toBe('/');
  });

  test('joinVfsPath normalizes result', () => {
    expect(joinVfsPath('/a', 'b', '../c')).toBe('/a/c');
  });

  test('normalizeVfsPath empty stack with relative returns .', () => {
    expect(normalizeVfsPath('..')).toBe('.');
  });

  test('normalizeVfsPath just dots returns .', () => {
    expect(normalizeVfsPath('.')).toBe('.');
  });

  test('dirnameVfsPath relative single segment returns .', () => {
    expect(dirnameVfsPath('file.txt')).toBe('.');
  });

  test('dirnameVfsPath empty parts join returns .', () => {
    expect(dirnameVfsPath('./file.txt')).toBe('.');
  });

  test('ensureDirs at root triggers parent === current break', () => {
    const vfs = new MemoryVfs();
    vfs.writeText('/root.txt', 'x');
    expect(vfs.stat('/root.txt').isFile).toBe(true);
  });

  test('readdirNames with empty name segment', () => {
    const vfs = new MemoryVfs({ '/a/b.txt': 'x' });
    // Writing a file at root-level ensures readdirNames processes it
    vfs.writeText('/root.txt', 'y');
    const names = vfs.readdirNames('/');
    expect(names).toContain('root.txt');
  });

  test('pathBasename fallback for empty normalized path', () => {
    const host = new WebVfsHostAdapter();
    // normalizeVfsPath('') returns '.', split gives ['.'], at(-1) gives '.'
    expect(host.pathBasename('')).toBe('.');
  });
});
