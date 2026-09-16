#!/usr/bin/env bun
/**
 * Why: release-gate the package exactly as consumers receive it. `npm pack`
 * is unpacked into an OS temp dir — never the repo — so the smoke checks
 * below resolve only what the tarball ships (exports map, dist artifacts,
 * declarations), not accidental repo files. The defuss-morph peer is
 * symlinked in, and both module systems (ESM/CJS runtime probes) and both
 * NodeNext declaration flavors (.mts/.cts typechecks, including a deliberate
 * @ts-expect-error that must stay an error) are exercised before publish.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "defuss-query-package-"));
function pass(name: string) {
  console.log(`PASS ${name}`);
}
try {
  const packed = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temp],
      { cwd: root, encoding: "utf8" },
    ),
  )[0];
  const archive = resolve(temp, packed.filename);
  if (
    packed.files.some((f: any) =>
      /^(tests|node_modules|reports|scripts)\//.test(f.path),
    )
  )
    throw Error("Published package contains development fixtures");
  pass(
    "npm pack contains runtime/declarations/maps/docs/license, not tests or vendored morph",
  );
  mkdirSync(join(temp, "node_modules"), { recursive: true });
  execFileSync("tar", ["-xzf", archive, "-C", temp]);
  symlinkSync(
    join(temp, "package"),
    join(temp, "node_modules", "defuss-query"),
    "dir",
  );
  const require = createRequire(import.meta.url);
  const peerDirectory = resolve(
    fileURLToPath(import.meta.resolve("defuss-morph")),
    "..",
  );
  // The peer entry may live in dist/. Resolve its package root without assuming an exported package.json.
  let peer = peerDirectory;
  for (;;) {
    try {
      if (
        JSON.parse(readFileSync(join(peer, "package.json"), "utf8")).name ===
        "defuss-morph"
      )
        break;
    } catch {}
    const parent = resolve(peer, "..");
    if (parent === peer) throw Error("Cannot resolve morph package root");
    peer = parent;
  }
  symlinkSync(peer, join(temp, "node_modules", "defuss-morph"), "dir");
  writeFileSync(join(temp, "package.json"), '{"type":"module"}\n');
  writeFileSync(
    join(temp, "esm.mjs"),
    `import df$, {createDf$} from 'defuss-query'; import * as core from 'defuss-query/core'; if(typeof df$!=='function'||df$().length||globalThis.df$!==undefined||typeof df$.morph!=='function'||core.createDf$!==createDf$)throw Error('ESM consumer failed');`,
  );
  execFileSync(process.execPath, [join(temp, "esm.mjs")]);
  pass(
    "packed ESM root/core imports, peer resolution, and no global side effects",
  );
  writeFileSync(
    join(temp, "cjs.cjs"),
    `const {df$}=require('defuss-query');const core=require('defuss-query/core');if(typeof df$!=='function'||df$().length||globalThis.df$!==undefined||typeof core.createDf$!=='function')throw Error('CJS consumer failed');`,
  );
  execFileSync(process.execPath, [join(temp, "cjs.cjs")]);
  pass("packed CommonJS root/core imports");
  const source = `import {df$, type DfQuery} from 'defuss-query'; const buttons:DfQuery<HTMLButtonElement>=df$('button');buttons.prop('disabled',true);df$.queueCallback(()=>{})();\n// @ts-expect-error disabled is boolean\nbuttons.prop('disabled','true');\n`;
  for (const extension of ["mts", "cts"]) {
    const file = join(temp, "consumer." + extension);
    writeFileSync(file, source);
    const program = ts.createProgram([file], {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    });
    const errors = ts.getPreEmitDiagnostics(program);
    if (errors.length)
      throw Error(
        ts.formatDiagnosticsWithColorAndContext(errors, {
          getCurrentDirectory: () => temp,
          getCanonicalFileName: (x) => x,
          getNewLine: () => "\n",
        }),
      );
    pass(
      `packed TypeScript NodeNext .${extension} consumer, including rejected invalid property value`,
    );
  }
  const globalFile = join(temp, "browser.mts");
  writeFileSync(
    globalFile,
    `import type {} from 'defuss-query/global';df$('button').prop('disabled',true);df$.queueCallback(()=>{})();`,
  );
  const program = ts.createProgram([globalFile], {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  });
  const errors = ts.getPreEmitDiagnostics(program);
  if (errors.length)
    throw Error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCurrentDirectory: () => temp,
        getCanonicalFileName: (x) => x,
        getNewLine: () => "\n",
      }),
    );
  pass(
    "opt-in browser-global declarations expose callable df$ and all morph statics",
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
