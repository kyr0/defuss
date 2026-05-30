import { brotliCompress, constants as zlibConstants } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const brotliCompressAsync = promisify(brotliCompress);

const input = resolve(process.argv[2] ?? "dist/out.wasm");
const output = resolve(process.argv[3] ?? `${input}.br`);

const source = await readFile(input);
const compressed = await brotliCompressAsync(source, {
  params: {
    [zlibConstants.BROTLI_PARAM_QUALITY]: 5,
    [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_GENERIC,
  },
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, compressed);
console.log(`wrote ${output} (${source.length} -> ${compressed.length} bytes)`);
