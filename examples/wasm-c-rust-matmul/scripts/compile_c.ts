import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const fileToDataUrl = async (filePath: string): Promise<string> => {
  try {
    const fileBuffer = await readFile(filePath);
    const base64Data = fileBuffer.toString("base64");
    return `data:application/octet-stream;base64,${base64Data}`;
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
};

if (!existsSync("src/.gen/wasm_c")) {
  // create dist/wasm_c folder
  mkdirSync("src/.gen/wasm_c", { recursive: true });
}

// Command to compile the C code with emscripten
const result = spawnSync(
  "emcc",
  [
    "src/wasm_c.c",
    "-s",
    `EXPORTED_FUNCTIONS=["_dot_product_c", "_dot_product_serial_c_plain", "_dot_product_serial_c", "_malloc", "_free"]`,
    "-s",
    `EXPORTED_RUNTIME_METHODS=["HEAPF32"]`,
    "-s",
    "ALLOW_MEMORY_GROWTH=1",
    "-s",
    "MAXIMUM_MEMORY=4GB",
    "-msimd128",
    "-O2",
    "-o",
    "src/.gen/wasm_c/wasm_c.mjs",
    "--minify",
    "0",
    "-gsource-map",
    "--emit-tsd",
    "wasm_c.d.ts",
  ],
  {
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("Error executing emcc:", result.error);
} else {
  console.log("emcc command executed successfully");
}

const dataUrl = await fileToDataUrl("src/.gen/wasm_c/wasm_c.wasm");

let dotProductRuntime = readFileSync("src/.gen/wasm_c/wasm_c.mjs", "utf-8");

// code injection and auto-deserialization of the wasm binary data
dotProductRuntime = dotProductRuntime.replace(
  "var wasmBinaryFile;",
  `
const dataUrlToUint8Array = (dataUrl) => {
  // extract the base64 encoded part from the data URL
  const base64String = dataUrl.split(',')[1];
  
  // decode the base64 string into a binary string
  const binaryString = atob(base64String);

  // create a Uint8Array from the binary string
  const binaryLength = binaryString.length;
  const bytes = new Uint8Array(binaryLength);
  
  for (let i = 0; i < binaryLength; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};
var wasmBinaryFile = '${dataUrl}';
wasmBinary = dataUrlToUint8Array(wasmBinaryFile);
`,
);

writeFileSync("src/.gen/wasm_c/wasm_c.mjs", dotProductRuntime);

const resultPkgRoll = spawnSync("pkgroll", {
  stdio: "inherit",
});

if (resultPkgRoll.error) {
  console.error("Error executing emcc:", resultPkgRoll.error);
} else {
  console.log("pkgroll command executed successfully");
}

// for dynamic loading, we copy the compile output into the public folder
if (!existsSync("public/wasm_c")) {
  // create public/wasm_c folder
  mkdirSync("public/wasm_c", { recursive: true });
}

const compileOutputFiles = [
  "wasm_c.mjs",
  "wasm_c.wasm",
  "wasm_c.d.ts",
  "wasm_c.wast",
  "wasm_c.wasm.map",
];

compileOutputFiles.forEach((file) => {
  const srcPath = `dist/wasm_c/${file}`;
  const destPath = `public/wasm_c/${file}`;
  if (existsSync(srcPath)) {
    writeFileSync(destPath, readFileSync(srcPath));
  } else {
    console.warn(`File ${srcPath} does not exist, skipping copy.`);
  }
});
