import path from "node:path";

const SKIPPED_DIRECTORIES = [
  ".git",
  ".hg",
  ".svn",
  ".idea",
  ".vscode",
  "node_modules",
  "bower_components",
  "vendor",
  ".pnpm-store",
  ".yarn",
  ".turbo",
  ".cache",
  ".parcel-cache",
  ".vite",
  ".rollup.cache",
  ".rspack-cache",
  ".eslintcache",
  ".stylelintcache",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".angular",
  ".output",
  "dist",
  "build",
  "out",
  "target",
  "bin",
  "obj",
  "coverage",
  ".nyc_output",
  "playwright-report",
  "test-results",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".conda",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".tox",
  ".eggs",
  ".gradle",
  ".mvn",
  ".settings",
  ".bundle",
  "_build",
  "deps",
  "dist-newstyle",
  ".stack-work",
  "storybook-static",
  "tmp",
  "temp",
  "logs",
  "log",
] as const;

const SENSITIVE_EXACT_BASENAMES = new Set([
  "id_rsa",
  "id_ed25519",
  "known_hosts",
  "authorized_keys",
  ".npmrc",
  ".pypirc",
  ".netrc",
]);

const SENSITIVE_SUFFIXES = [
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".crt",
  ".cer",
  ".der",
  ".csr",
  ".p7b",
  ".p7c",
  ".jks",
  ".keystore",
  ".asc",
  ".gpg",
  ".kdbx",
] as const;

export const MAX_FILE_SIZE_BYTES = 125 * 1024;

export const FAST_GLOB_IGNORE_PATTERNS: readonly string[] = [
  // All dot folders at any depth (and everything inside them)
  ".*/**",
  "**/.*/**",
  // All dot files at any depth
  "**/.*",
  // All .env* files at any depth
  "**/.env*",
  // Explicit directory list
  ...SKIPPED_DIRECTORIES.flatMap((directory) => [
    `${directory}/**`,
    `**/${directory}/**`,
  ]),
];

export function shouldSkipSensitivePath(filePath: string): boolean {
  const baseName = path.basename(filePath).toLowerCase();
  const normalizedPath = filePath.split(path.sep).join("/");

  // Skip all dot files (basename starts with ".")
  if (baseName.startsWith(".")) {
    return true;
  }

  // Skip any file inside a dot folder at any depth
  const segments = normalizedPath.split("/");
  if (segments.some((seg, i) => i < segments.length - 1 && seg.startsWith("."))) {
    return true;
  }

  if (SENSITIVE_EXACT_BASENAMES.has(baseName)) {
    return true;
  }

  return SENSITIVE_SUFFIXES.some((suffix) => baseName.endsWith(suffix));
}

export function normalizeGlobPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
