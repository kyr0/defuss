# defuss-ssg

Static site generation, request-time dev SSR, file-based endpoints, and production serving for defuss.

`defuss-ssg` is both a CLI and a library:

- `dev` starts a Vite server and renders MD/MDX pages on demand through SSR.
- `build` renders static HTML, bundles client components, compiles endpoints, and copies assets.
- `serve` serves built output with `defuss-express`, plus dynamic endpoints and optional RPC.

Use Bun for package management. The published package targets Node `^20.19.0 || >=22.12.0`.

## What It Supports

- Markdown and MDX pages from `pages/`
- YAML or TOML frontmatter exposed as `meta`
- GitHub Flavored Markdown via `remark-gfm`
- KaTeX math via `$...$` and `$$...$$`
- defuss components imported into MDX and HTML-like pages
- Automatic hydration boundaries for components rendered from `components/`
- Static assets copied from `assets/`
- File-based API routes from `pages/**/*.ts` and `pages/**/*.js`
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
├── pages/
│   ├── index.mdx
│   └── api/
│       └── ping.json.ts
├── components/
│   └── button.tsx
├── assets/
│   └── styles.css
├── config.ts
└── rpc.ts
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

## How It Works

### Dev Mode

`defuss-ssg dev` starts a Vite server rooted at your project. Requests for MD and MDX pages are resolved through Vite's transform pipeline and rendered on demand with SSR. Page, component, endpoint, RPC, config, and asset changes are coalesced before reload. CSS assets are hot-swapped when possible, and hydration boundaries restore local form and scroll state across component updates.

By default, the CLI keeps `dist/` refreshed during dev as a compatibility fallback for middleware paths. Programmatic users can disable that bridge with `writeDevOutput: false`.

### Build Mode

`defuss-ssg build` loads `config.ts`, copies the project into `.ssg-temp`, renders each page through a temporary Vite SSR server, applies automatic hydration wrapping, bundles client components, compiles endpoints into `.endpoints`, copies assets into `dist`, and removes the temp directory unless debug mode is enabled.

### Serve Mode

`defuss-ssg serve` reads the built output from `dist/` and serves it with `defuss-express`. Dynamic endpoint modules are registered at runtime, and `rpc.ts` or `rpc.js` is compiled and initialized automatically when RPC is enabled and `defuss-rpc` is installed.

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
defuss-ssg [dev|build|serve] [folder] [--debug] [--multicore]

No args           -> serve .
Single path       -> serve <path>
Single command    -> <command> .
Command + folder  -> <command> <folder>
```

Commands:

- `dev`: starts the Vite dev server on port `3000` by default
- `build`: generates the static site into `dist/`
- `serve`: serves the built output from `dist/`

Flags:

- `--debug` or `-d`: enable verbose logging
- `--multicore`: use `workers: "auto"` for `serve`

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
