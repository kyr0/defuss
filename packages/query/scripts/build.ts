#!/usr/bin/env bun
/**
 * Why: produce every published artifact from one typechecked source graph.
 *
 * 1. dist/*.js + dist/cjs — plain tsc ESM and CJS outputs for npm consumers.
 * 2. dist/all.js + all.min.js — the CDN browser ESM bundle. The dom/query/all
 *    modules form a closed graph, so the bundle is assembled by AST filtering
 *    (drop imports/re-exports, un-export dom internals except
 *    createDomAdapter) instead of text surgery — the output can never desync
 *    from what TypeScript checked.
 * 3. dist/global.min.js — a classic-script IIFE variant (exports stripped
 *    via ts.transform) for deterministic load order without module/defer
 *    races.
 * 4. dist/stats.json — raw/gzip/brotli byte sizes, recomputed on every build
 *    so verify.ts and the README table always read fresh numbers.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";
import ts from "typescript";
import { minify } from "terser";
const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const config = ts.readConfigFile(
  resolve(root, "tsconfig.json"),
  ts.sys.readFile,
);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
function compile(options: ts.CompilerOptions) {
  const program = ts.createProgram(parsed.fileNames, {
    ...parsed.options,
    ...options,
  });
  const errors = ts.getPreEmitDiagnostics(program);
  if (errors.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (x) => x,
        getNewLine: () => "\n",
      }),
    );
  const result = program.emit();
  if (result.emitSkipped) throw new Error("TypeScript emit failed");
}
rmSync(dist, { recursive: true, force: true });
compile({});
compile({
  outDir: resolve(dist, "cjs"),
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
});
writeFileSync(resolve(dist, "cjs/package.json"), ' {"type":"commonjs"}\n');
// Browser bundle assembly by AST filtering (see the file header for why the
// closed three-module graph makes this safe). Browser tests exercise both
// bundled outputs.
const files = ["dom", "query", "all"];
const printer = ts.createPrinter();
const bundle = files
  .map((name) => {
    const path = resolve(dist, `${name}.js`);
    const file = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.JS,
    );
    const statements = file.statements
      .filter(
        (node) =>
          !ts.isImportDeclaration(node) &&
          !(ts.isExportDeclaration(node) && node.moduleSpecifier),
      )
      .map((node) =>
        name === "dom" &&
        (node as any).name?.text !== "createDomAdapter" &&
        ts.canHaveModifiers(node)
          ? ts.factory.replaceModifiers(
              node,
              ts
                .getModifiers(node)
                ?.filter((mod) => mod.kind !== ts.SyntaxKind.ExportKeyword),
            )
          : node,
      );
    return printer
      .printFile(ts.factory.updateSourceFile(file, statements))
      .replace(/^\/\/# sourceMappingURL=.*$/gm, "");
  })
  .join("\n");
const banner = `/*! defuss-query ${pkg.version} | MIT | Aron Homberg */\n`;
writeFileSync(resolve(dist, "all.js"), banner + bundle);
rmSync(resolve(dist, "all.js.map"), { force: true });
const min = await minify(
  { "all.js": bundle },
  {
    module: true,
    // terser's option types lag its runtime ES2022 support.
    ecma: 2022 as any,
    compress: { passes: 2 },
    mangle: true,
    format: { preamble: banner.trim() },
    sourceMap: {
      filename: "all.min.js",
      url: "all.min.js.map",
      includeSources: true,
    },
  },
);
writeFileSync(resolve(dist, "all.min.js"), min.code + "\n");
writeFileSync(resolve(dist, "all.min.js.map"), min.map + "\n");
// Also ship a classic script: deterministic script loading without a module/defer race.
const sf = ts.createSourceFile(
  "all.js",
  bundle,
  ts.ScriptTarget.ES2022,
  true,
  ts.ScriptKind.JS,
);
const plain = ts.transform(sf, [
  (context) => (node) =>
    ts.visitNode(node, function visit(n: ts.Node): ts.Node | undefined {
      if (ts.isExportAssignment(n) || ts.isExportDeclaration(n))
        return undefined;
      if (ts.canHaveModifiers(n)) {
        const mods = ts
          .getModifiers(n)
          ?.filter(
            (m) =>
              m.kind !== ts.SyntaxKind.ExportKeyword &&
              m.kind !== ts.SyntaxKind.DefaultKeyword,
          );
        if (mods) n = ts.factory.replaceModifiers(n, mods);
      }
      return ts.visitEachChild(n, visit, context);
    }) as ts.SourceFile,
]);
const iife =
  "(()=>{\n" +
  printer.printFile(plain.transformed[0] as ts.SourceFile) +
  "\n})();";
plain.dispose();
const classic = await minify(iife, {
  // Same terser option-type gap as above.
  ecma: 2022 as any,
  compress: { passes: 2 },
  mangle: true,
  format: { preamble: banner.trim() },
});
writeFileSync(resolve(dist, "global.min.js"), classic.code + "\n");
const stats: any = { package: pkg.name, version: pkg.version, files: {} };
for (const name of ["all.js", "all.min.js", "global.min.js"]) {
  const bytes = readFileSync(resolve(dist, name));
  stats.files[name] = {
    bytes: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes).length,
  };
}
writeFileSync(
  resolve(dist, "stats.json"),
  JSON.stringify(stats, null, 2) + "\n",
);
console.log(JSON.stringify(stats, null, 2));
