# defuss-ssg

Static site generation, request-time dev SSR, file-based endpoints, and production serving for defuss.

`defuss-ssg` is both a CLI and a library:

- `dev` starts a Vite server and renders MD/MDX pages on demand through SSR.
- `build` renders static HTML, bundles client components, compiles endpoints, and copies assets.
- `serve` serves built output with `defuss-express`, plus dynamic endpoints and optional RPC.

Use Bun for package management. The published package and the container runtime both target Node `^20.19.0 || >=22.12.0`.

## What It Supports

- Markdown and MDX pages from `pages/` or `src/pages/`
- YAML or TOML frontmatter exposed as `meta`
- GitHub Flavored Markdown via `remark-gfm`
- KaTeX math via `$...$` and `$$...$$`
- defuss components imported into MDX and HTML-like pages
- Automatic hydration boundaries for components rendered from `components/`, `src/components/`, `csr/`, or `src/csr/`
- Static assets copied from `assets/` or `src/assets/`
- Vite-style `public/` assets copied to the output root and served at `/<file>`
- File-based API routes from `pages/**/*.ts` and `pages/**/*.js`
- Root `index.mdx`, `index.md`, or `index.html` fallback when no pages directory exists
- Pre-rendered endpoints via `prerender = true` and `getStaticPaths()`
- RPC auto-discovery from `rpc.ts` or `rpc.js` when `defuss-rpc` is installed
- Plugin hooks for `pre`, `page-vdom`, `page-dom`, `page-html`, and `post`
- Multicore production serving through `--multicore` or `workers: "auto"`

## Install

Run directly:

```bash
bunx defuss-ssg build ./my-site
```

Or add it as a dev dependency:

```bash
bun add -D defuss-ssg
```

## Quick Start

```text
my-site/
├-- pages/
|   ├-- index.mdx
|   └-- api/
|       └-- ping.json.ts
├-- components/
|   └-- button.tsx
├-- assets/
|   └-- styles.css
├-- config.ts
└-- rpc.ts
```

Minimal config:

```ts
import { rehypePlugins, remarkPlugins, type SsgConfig } from "defuss-ssg";

const config: SsgConfig = {
	pages: "pages",
	output: "dist",
	components: "components",
	assets: "assets",
	tmp: ".ssg-temp",
	plugins: [],
	remarkPlugins: [...remarkPlugins],
	rehypePlugins: [...rehypePlugins],
	rpc: true,
};

export default config;
```

Example page:

```mdx
---
title: Home
---

import { Button } from "../components/button.js";

# {meta.title}

This page uses MDX, frontmatter, and a defuss component.

<Button label="Click me" />
```

Example component:

```tsx
export function Button({ label }: { label: string }) {
	return <button type="button">{label}</button>;
}
```

Build the site:

```bash
defuss-ssg build ./my-site
```

Start Vite-powered development:

```bash
defuss-ssg dev ./my-site
```

Serve the already built output:

```bash
defuss-ssg serve ./my-site
```

`serve` expects existing build output in `dist/`, so run `build` first.

## Docker and Podman

The container image uses Bun in the builder stage and ships a Node runtime image with Bun available for project setup at startup. Container usage still mirrors `bunx defuss-ssg <cli-args>`, but the container now runs the mounted project's own setup flow first: it reads that project's `package.json`, uses its declared package manager, installs that project's dependencies into the mounted project, and then runs `dev`, `build`, or `serve`.

Build the image from this directory:

```bash
docker build -t defuss-ssg -f Dockerfile ../..
podman build -t defuss-ssg -f Dockerfile ../..
```

Run a one-off build against a mounted site:

```bash
docker run --rm -it \
	-v "$PWD/../../example-ssg:/workspace" \
	-v defuss-ssg-node-modules:/workspace/node_modules \
	defuss-ssg build /workspace
```

Serve the built output with one published port:

```bash
docker run --rm -it \
	-p 3000:3000 \
	-v "$PWD/../../example-ssg:/workspace" \
	-v defuss-ssg-node-modules:/workspace/node_modules \
	defuss-ssg serve /workspace --multicore --host 0.0.0.0 --port 3000
```

Start dev mode with Vite HMR through the same public port:

```bash
docker run --rm -it \
	-p 3000:3000 \
	-v "$PWD/../../example-ssg:/workspace" \
	-v defuss-ssg-node-modules:/workspace/node_modules \
	defuss-ssg dev /workspace --host 0.0.0.0 --port 3000
```

To persist container-installed project dependencies between runs, add a container-managed volume for `node_modules`:

```bash
docker run --rm -it \
	-p 3000:3000 \
	-v "$PWD/../../example-ssg:/workspace" \
	-v defuss-ssg-node-modules:/workspace/node_modules \
	defuss-ssg dev /workspace --host 0.0.0.0 --port 3000
```

Replace `docker` with `podman` for the same commands.

Notes:

- The container runs the same `setup()` flow as local CLI usage and installs the mounted project's declared dependencies with its declared package manager.
- Use a container-managed volume for `/workspace/node_modules` if you want install results to persist between container runs. Avoid bind-mounting a host `node_modules` directory across OS/architecture boundaries.
- This keeps local non-container usage and container usage aligned: the project owns its dependency graph in both cases.
- One published port is enough, even with `--multicore`. `defuss-express` keeps worker ports internal and load-balances behind the public port.
- `compose.yml` provides `ssg` and `ssg-dev` services. Set `SSG_SITE=/abs/path/to/site` to override the default example mount.

Compose examples:

```bash
docker compose up ssg
docker compose --profile dev up ssg-dev
```

## How It Works

### Dev Mode

`defuss-ssg dev` starts a Vite server rooted at your project. Requests for MD and MDX pages are resolved through Vite's transform pipeline and rendered on demand with SSR. Page, component, endpoint, RPC, config, and asset changes are coalesced before reload. CSS assets are hot-swapped when possible, and hydration boundaries restore local form and scroll state across component updates.

By default, the CLI keeps `dist/` refreshed during dev as a compatibility fallback for middleware paths. Programmatic users can disable that bridge with `writeDevOutput: false`.

### Build Mode

`defuss-ssg build` loads `config.ts`, copies the project into `.ssg-temp`, renders each page through a temporary Vite SSR server, applies automatic hydration wrapping, bundles client components, compiles endpoints into `.endpoints`, copies assets into `dist`, and removes the temp directory unless debug mode is enabled.

### Serve Mode

`defuss-ssg serve` reads the built output from `dist/` and serves it with `defuss-express`. Dynamic endpoint modules are registered at runtime, and `rpc.ts` or `rpc.js` is compiled and initialized automatically when RPC is enabled and `defuss-rpc` is installed.

## Content Discovery

For generation-time listings such as blog archives, `defuss-ssg` now exposes a small `glob()` API.

Use the virtual module inside MDX or other code that Vite evaluates for SSR:

```ts
import { glob } from "virtual:defuss-ssg/content";

export const posts = (await glob("pages/blog/**/*.mdx")).sort((left, right) =>
	String(right.meta.date || "").localeCompare(String(left.meta.date || "")),
);
```

Use the direct package export in non-Vite server-side contexts such as `config.ts` or custom plugins:

```ts
import { glob } from "defuss-ssg";

const posts = await glob("pages/blog/**/*.mdx", {
	cwd: process.cwd(),
});
```

Each entry contains:

- `filePath`: absolute file path
- `relativePath`: path relative to `cwd`
- `slug`: route-like identifier without a leading slash
- `route`: public route when the file lives under the configured `pages` directory
- `meta`: parsed YAML or TOML frontmatter

Notes:

- `cwd` defaults to the current working directory for the direct helper.
- The virtual module binds `cwd` and `pages` to the active SSG project automatically.
- `route` is only derived for files inside the configured `pages` directory.
- v1 returns metadata records only; it does not eagerly execute every matched MDX module.

## Endpoints

Endpoint source files live under `pages/` and export HTTP method handlers.

```ts
import type { APIRoute } from "defuss-ssg";

export const GET: APIRoute = async () => {
	return Response.json({ ok: true, ts: Date.now() });
};
```

Supported method exports are `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, and `ALL`.

Dynamic routes use bracket syntax:

```text
pages/api/[id].json.ts  ->  /api/:id.json
pages/feed.xml.ts       ->  /feed.xml
```

To pre-render an endpoint during `build`, export `prerender = true`. Dynamic routes can also export `getStaticPaths()`.

```ts
import type { APIRoute } from "defuss-ssg";

export const prerender = true;

export const getStaticPaths = () => [
	{ params: { slug: "hello-world" } },
	{ params: { slug: "release-notes" } },
];

export const GET: APIRoute = async ({ params }) => {
	return new Response(`Post: ${params.slug}`);
};
```

## RPC

RPC is optional and discovered automatically from `rpc.ts` or `rpc.js` in the project root. Install `defuss-rpc` to enable it.

```ts
export default {
	mathApi: {
		add: async (a: number, b: number) => a + b,
	},
	greetApi: {
		hello: async (name: string) => `Hello, ${name}!`,
	},
};
```

When RPC is active, `defuss-ssg` exposes:

- `POST /rpc`
- `POST /rpc/schema`

Set `rpc: false` in `config.ts` to disable RPC discovery.

## Plugins

`defuss-ssg` plugins run in build order and can modify the pipeline at distinct phases.

```ts
import type { SsgPlugin } from "defuss-ssg";

const htmlStampPlugin: SsgPlugin = {
	name: "html-stamp",
	phase: "page-html",
	mode: "both",
	fn: (html, relativeOutputHtmlFilePath) => {
		return html.replace(
			"</body>",
			`<!-- built:${relativeOutputHtmlFilePath} --></body>`,
		);
	},
};

export default {
	plugins: [htmlStampPlugin],
};
```

Available phases:

- `pre`: before a full build starts
- `page-vdom`: after page VDOM creation and before render
- `page-dom`: after DOM render and before serialization
- `page-html`: after HTML serialization and before write
- `post`: after the build completes

`page-vdom` hooks receive the page props/module exports as their fifth argument.

## Programmatic API

```ts
import { build, dev, serve, setup } from "defuss-ssg";

const projectDir = "./my-site";

const setupStatus = await setup(projectDir);
if (setupStatus.code !== "OK") {
	throw new Error(setupStatus.message);
}

await build({
	projectDir,
	mode: "build",
	debug: true,
});

await dev({
	projectDir,
	port: 3000,
	host: true,
	writeDevOutput: true,
});

await serve({
	projectDir,
	port: 3000,
	workers: "auto",
});
```

The main package exports `build`, `dev`, `serve`, `setup`, config defaults, endpoint types, RPC helpers, and plugin types.

Advanced subpath exports:

- `defuss-ssg/vite`: exposes `defussSsg()` for custom Vite integration
- `defuss-ssg/runtime`: exposes the client runtime used for navigation, hydration, and live reload

Most projects only need the main package export.

## CLI Reference

```bash
defuss-ssg [dev|build|serve] [folder] [options]

No args           -> dev .
Single path       -> dev <path>
Single command    -> <command> .
Command + folder  -> <command> <folder>
```

When `pages`, `components`, or `assets` are not configured explicitly, `defuss-ssg` prefers `src/pages`, `src/components`, `src/csr`, and `src/assets` before falling back to their project-root equivalents. If no pages directory exists, it falls back to root `index.mdx`, then `index.md`, then `index.html`. A project-root `public/` directory is treated like Vite/Astro `public`: its files are available at the site root.

Commands:

- `dev`: starts the Vite dev server on port `3000` by default
- `build`: generates the static site into `dist/`
- `serve`: serves the built output from `dist/`

Flags:

- `--debug` or `-d`: enable verbose logging
- `--multicore`: use `workers: "auto"` for `serve`
- `--host` or `-H <host>`: override the dev or serve bind host
- `--port` or `-p <port>`: override the dev or serve port
- `--skip-setup` or `--no-setup`: skip project dependency installation for prepared environments and containers

## Local Package Development

To work on `defuss-ssg` inside this monorepo:

```bash
git clone https://github.com/kyr0/defuss.git
cd defuss/packages/ssg
bun install
bun run build
bun run cli-dev
```

The example project used by the package scripts lives in `../../example-ssg/`.

## Benchmarking

The benchmark scripts are for local experiments, not committed performance guarantees.

```bash
bun run bench
bun run bench:rpc
```

Benchmark result snapshots are written to `.tmp/bench-results.json` by default. Override that path with `RESULTS_FILE=/path/to/file.json` if needed.

For local load-balancing experiments, use `scripts/lb.ts` directly.
