<h1 align="center">

<img src="../../assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-vfs</code>
</p>

<sup align="center">

Isomorphic Virtual File System for Web and Node.js

</sup>

</h1>

`defuss-vfs` is a lightweight, isomorphic virtual file system with in-memory backing. It works identically in Node.js and browsers, providing file operations, directory traversal, and binary VFS image packing/unpacking.

## Installation

```bash
bun add defuss-vfs
```

## API

### MemoryVfs

The core in-memory virtual file system. Supports files, directories, reading, writing, and traversal.

```ts
import { MemoryVfs } from "defuss-vfs";

// Create with initial files
const vfs = new MemoryVfs({
  "/src/index.ts": "console.log('hello');",
  "/src/utils.ts": "export const x = 1;",
  "/README.md": "# Project",
});

// Read
vfs.readText("/src/index.ts");       // "console.log('hello');"
vfs.readBytes("/src/index.ts");      // Uint8Array

// Write
vfs.writeText("/src/config.json", '{"debug": true}');
vfs.writeBytes("/data.bin", new Uint8Array([1, 2, 3]));

// Directory operations
vfs.readdirNames("/src");            // ["config.json", "index.ts", "utils.ts"]
vfs.readdirCount("/src");            // 3
vfs.stat("/src");                    // { exists: true, isFile: false, isDir: true, size: 0 }
vfs.stat("/src/index.ts");           // { exists: true, isFile: true, isDir: false, size: 21 }

// Remove & rename
vfs.remove("/src/config.json");
vfs.rename("/src/utils.ts", "/src/helpers.ts");

// Clone & overlay
const copy = vfs.clone();
const merged = vfs.overlay({ "/new.txt": "added" });
```

### WebVfsHostAdapter

A host adapter that wraps `MemoryVfs` with a runtime API including path utilities, stdout/stderr capture, and environment variables.

```ts
import { WebVfsHostAdapter } from "defuss-vfs";

const host = WebVfsHostAdapter.fromInput(
  { "/app/main.ts": "console.log('run');" },
  {
    argv: ["node", "main.ts"],
    env: { NODE_ENV: "production" },
  },
);

host.readText("/app/main.ts");
host.pathJoin("/a", "b/c");         // "/a/b/c"
host.pathDirname("/a/b/c.ts");      // "/a/b"
host.pathBasename("/a/b/c.ts");     // "c.ts"
host.pathExt("/a/b/c.ts");          // ".ts"

host.writeStdout("hello\n");
host.stdout;                        // "hello\n"
```

### VFS Image Packing/Unpacking

Pack a set of files into a compact binary image and unpack it back.

```ts
import { packVfsImage, parseVfsImage, unpackVfsImage } from "defuss-vfs";

// Pack files into a binary image
const image = packVfsImage({
  "/src/index.ts": "export main();",
  "/src/lib.ts": "export function main() {}",
});

// Parse index without extracting files
const index = parseVfsImage(image);
// [{ path: "/src/index.ts", offset: 42, length: 16 }, ...]

// Unpack back to MemoryVfs
const vfs = unpackVfsImage(image);
vfs.readText("/src/index.ts");  // "export main();"
```

### Path Utilities

Low-level path helpers for virtual paths:

```ts
import { normalizeVfsPath, dirnameVfsPath, joinVfsPath } from "defuss-vfs";

normalizeVfsPath("/a/./b/../c");  // "/a/c"
dirnameVfsPath("/a/b/c.ts");      // "/a/b"
joinVfsPath("/a", "b", "c");      // "/a/b/c"
```

## VFS Image Format

The binary format is:

| Offset | Size | Content |
|--------|------|---------|
| 0 | 4 | Magic: `GVFS` |
| 4 | 1 | Version: `1` |
| 5 | 4 | Header length (little-endian uint32) |
| 9 | N | JSON-encoded index: `[[path, offset, length], ...]` |
| 9+N | M | File payloads concatenated |

## Browser Compatibility

`defuss-vfs` uses only web-standard APIs (`Map`, `Set`, `TextEncoder`, `TextDecoder`, `Uint8Array`) and works in all modern browsers without polyfills.

## License

MIT
