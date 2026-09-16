#!/usr/bin/env bun
/**
 * Why: the static release gate, run after `build`. Every published fact is
 * re-derived from the artifacts instead of trusted: versions must agree
 * across package.json, dist/stats.json, and QUERY_VERSION; all artifacts
 * and their source maps must exist; browser bundles must stay within the
 * byte budgets and free of an embedded morph engine (morph comes from its
 * own CDN script — embedding it would double the size and split the
 * delegated-event registry in two).
 *
 * Gzip/brotli sizes are recomputed here rather than read from stats.json, so
 * a stale or hand-edited stats file fails the gate.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import ts from "typescript";
const root = resolve(import.meta.dirname, "..");
const read = (name: string) => readFileSync(resolve(root, name));
const json = (name: string) => JSON.parse(read(name).toString());
const checks = [];
function check(condition: unknown, name: string) {
  if (!condition) throw Error(`VERIFY FAIL: ${name}`);
  checks.push(name);
  console.log(`PASS ${name}`);
}
const pkg = json("package.json"),
  stats = json("dist/stats.json");
check(
  stats.package === pkg.name && stats.version === pkg.version,
  "package/stats versions agree",
);
check(
  read("src/query.ts").toString().includes(`QUERY_VERSION = "${pkg.version}"`),
  "source/package versions agree",
);
for (const name of [
  "index.js",
  "index.d.ts",
  "query.js",
  "query.d.ts",
  "global.d.ts",
  "all.js",
  "all.min.js",
  "all.min.js.map",
  "global.min.js",
  "cjs/index.js",
  "cjs/index.d.ts",
  "cjs/package.json",
])
  check(existsSync(resolve(root, "dist", name)), `artifact ${name} exists`);
for (const [name, expected] of Object.entries(stats.files)) {
  const bytes = read("dist/" + name);
  const actual = {
    bytes: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes).length,
  };
  check(
    JSON.stringify(actual) === JSON.stringify(expected),
    `fresh raw/gzip/Brotli stats: ${name}`,
  );
}
check(
  stats.files["all.min.js"].gzip <= 4608 &&
    stats.files["all.min.js"].bytes <= 13000,
  "browser ESM budget: <=4.5 KiB gzip and <=13,000 raw bytes",
);
check(
  stats.files["global.min.js"].gzip <= 4608,
  "classic script budget: <=4.5 KiB gzip",
);
for (const name of ["all.js", "all.min.js", "global.min.js"]) {
  const code = read("dist/" + name).toString();
  const sf = ts.createSourceFile(
    name,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  check(
    !sf.statements.some(
      (node) =>
        ts.isImportDeclaration(node) ||
        (ts.isExportDeclaration(node) && node.moduleSpecifier),
    ),
    `${name} has no external runtime imports`,
  );
  check(
    !code.includes("elementHandlerMap") &&
      !code.includes("defuss-morph.from-dom"),
    `${name} does not embed the morph engine`,
  );
}
check(
  read("dist/index.js").toString().includes('from "defuss-morph"'),
  "library entry imports its peer instead of embedding it",
);
check(
  json("dist/cjs/package.json").type === "commonjs",
  "CommonJS output has correct package scope",
);
for (const dir of ["dist", "dist/cjs"])
  for (const name of readdirSync(resolve(root, dir)).filter((name) =>
    name.endsWith(".js"),
  )) {
    const path = dir + "/" + name;
    const map = /\/\/# sourceMappingURL=(.+)/
      .exec(read(path).toString())?.[1]
      ?.trim();
    if (map)
      check(
        existsSync(resolve(root, dirname(path), map)),
        `source map exists: ${path}`,
      );
  }
check(
  json("dist/all.min.js.map").sourcesContent?.length > 0,
  "browser source map embeds readable source",
);
for (const name of [
  "README.md",
  "LICENSE",
  "examples/index.html",
  "examples/app.js",
])
  check(existsSync(resolve(root, name)), `file ${name} exists`);
console.log(`VERIFIED: ${checks.length} artifact checks`);

// README sync gate: the measured values in README.md (bundle sizes from this
// build, coverage from the test run) must be fresh. Runs after the tests in
// `check`, so coverage/coverage-summary.json is current. Prints agent
// instructions and exits 1 when a marked section is stale.
execFileSync("bun", [resolve(root, "scripts/readme-sync.ts")], {
  cwd: root,
  stdio: "inherit",
});
