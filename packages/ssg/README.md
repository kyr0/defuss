<h1 align="center">

<img src="https://github.com/kyr0/defuss/blob/main/assets/defuss_mascott.png?raw=true" width="100px" />

<p align="center">
  
  <code>defuss-ssg</code>

</p>

<sup align="center">

Static Site Generator (SSG) for defuss

</sup>

</h1>

<h3 align="center">
Usage
</h3>

Simply generate a static site from a content directory to an output directory with full defuss-MDX (GFM + Frontmatter) support:

```bash
npx defuss-ssg build ./folder
```

Or install globally or locally in a project:

```bash 
npm install -g defuss-ssg
```

And then run (in an NPM script or globally):

<h4>One-time builds</h4>

```bash
defuss-ssg build ./folder
```

<h4>Serve-mode with automatic re-build on change</h4>

```bash
defuss-ssg serve ./folder
```

This starts a local server at http://localhost:3000 and watches for changes in:

- `pages/` directory
- `components/` directory
- `assets/` directory

Changes trigger automatic rebuilds, with the last change always taking priority to prevent build queueing issues.

<h4>Local development of SSG and running the example</h4>

Unlike other SSG systems, this package is **not** meant to be installed in a project, but rather used as a global CLI tool or programmatically.

Developing this means to clone the repo, install dependencies and run the example site:

```bash
git clone

cd defuss/packages/ssg

pnpm i && pnpm build

# for building and serving the example site with auto-rebuild:
pnpm run cli-serve ./example

# for one-time build of the example site:
pnpm run cli-build ./example
```

Please create a PR or issue if you find any bugs or have feature requests.

<h4>Programmatic API</h4>

Advanced users may want to use the library programmatically:

```typescript
import { setup, build, serve } from "defuss-ssg";

(async () => {

  // Setup project initially
  const setupStatus = await setup("./my-site");
  if (setupStatus.code !== "OK") { 
    console.error("Setup failed:", setupStatus.message);
    process.exit(1);
  }

  // One-time build
  await build({
    projectDir: "./my-site",
    debug: true,
  });

  // Or serve with auto-rebuild
  await serve({
    projectDir: "./my-site", 
    debug: true,
  });
})();
```

<h3 align="center">
Overview
</h3>

> `defuss-ssg` is a CLI tool and library for building static websites using modern JavaScript/TypeScript and `defuss`. It reads content files (Markdown, MDX) from a specified directory, processes them with MDX plugins, compiles components with esbuild, and outputs fully static HTML sites ready for deployment.

> It supports a plugin system for extending the build process at various phases (pre-build, post-build, page-level transformations), automatic file watching and rebuilding in serve mode, and seamless integration with defuss components for interactive features.

<h3 align="center">

Features

</h3>

- **MDX Support**: Full Markdown + JSX support with frontmatter parsing
- **Component Integration**: Use defuss components in your MDX files
- **Plugin System**: Extend the build process with custom plugins at multiple phases
- **Fast Compilation**: Powered by esbuild for quick builds and hot reloading
- **Serve Mode**: Built-in development server with file watching and auto-rebuild
- **TypeScript Ready**: Full TypeScript support for components and configuration
- **Asset Handling**: Automatic copying of static assets to output directory
- **Flexible Configuration**: Configurable via TypeScript config file with sensible defaults

<h3 align="center">

Example site project structure

</h3>

Create a project structure like this:

```typescript
my-site/
├── pages/
│   ├── index.mdx
│   └── blog/
│       └── hello-world.mdx
├── components/
│   └── button.tsx
├── assets/
│   └── styles.css
└── config.ts
```
Then run `defuss-ssg build ./my-site` and a `dist` folder will be created with the complete static build.

<h3 align="center">

Config file

</h3>

You can customize the paths and behaviour of the build process, by creating a simple `config.ts` file in the project folder.

##### Example `config.ts` file

```typescript
import { remarkPlugins, rehypePlugins } from "defuss-ssg";

export default {
  pages: "pages",
  output: "dist",
  components: "components",
  assets: "assets",
  remarkPlugins: [...remarkPlugins], // default remark plugins
  rehypePlugins: [...rehypePlugins], // default rehype plugins
  plugins: [],
};
```

You may add any `remark` and `rehype` plugin of your choice. See the `MDX` documentation for more informations on Remark and Rehype.

`defuss-ssg` plugins can be registered via the `plugins` array and are executed in order of registration, in each build phase.

##### Example MDX page (`pages/index.mdx`)

```mdx
---
title: Home Page
---

import Button from "../components/button.js"

# Welcome to my site

This is a **markdown** page with JSX components.

<Button>Click me</Button>
```

##### Example Button component (`components/button.tsx`)

Components are imported as `.js` but saved as `.tsx`:

```typescript
export const Button = ({ label }: { label: string }) => {
  return (
    <button type="button" onClick={() => alert("Button clicked!")}>
      {label}
    </button>
  );
};
```


<h3 align="center">

Plugin System

</h3>

Extend the build process with plugins that run at different phases:

```typescript
import { rule, transval, access } from 'defuss-transval';

type UserData = {
  user: {
    profile: {
      name: string;
      email: string;
      settings: {
        theme: 'light' | 'dark';
        notifications: boolean;
      };
    };
    posts: Array<{
      title: string;
      published: boolean;
    import { SsgPlugin } from "defuss-ssg";

const myPlugin: SsgPlugin = {
  name: "my-plugin",
  phase: "page-html", // "pre" | "post" | "page-vdom" | "page-dom" | "page-html"
  fn: (html, relativePath, config) => {
    // Modify HTML before writing
    return html.replace("old-text", "new-text");
  },
};

export default {
  plugins: [myPlugin],
  // ... other config
};
```

Available plugin phases:

- **pre**: Before build starts
- **page-vdom**: After VDOM creation for each page
- **page-dom**: After DOM rendering for each page
- **page-html**: After HTML serialization for each page
- **post**: After build completes


<h3 align="center">

MDX Features

</h3>

`defuss-ssg` supports full MDX with `defuss` components and common GFM Markdown features:

- **Frontmatter**: YAML/TOML metadata extraction - the `meta` object holds frontmatter data - use e.g. `{ meta.title }` for page title defined in frontmatter like this: 
```mdx
--- 
title: My Page 
---
```

- **JSX Components**: Use `defuss` components in your content
- **Math Support**: KaTeX rendering with `$...$` and `$$...$$`
- **Custom Plugins**: Extend MDX processing with remark/rehype plugins

<h3 align="center">

Build Process

</h3>

The build process follows these steps:

1. **Copy Project**: Copy all files to temporary directory
2. **Compile MDX**: Process MDX files to ESM JavaScript
3. **Compile Components**: Bundle components with esbuild
4. **Evaluate Pages**: Run page functions to generate VDOM
5. **Render HTML**: Convert VDOM to HTML using defuss/server
6. **Run Plugins**: Execute plugins at various phases
7. **Copy Assets**: Copy static assets to output
8. **Clean Up**: Remove temporary files (unless debug mode)

<h3 align="center">

CLI Reference 

</h3>

```bash
defuss-ssg <command> <folder>

Commands:
  build <folder>    Build the static site
  serve <folder>    Serve with auto-rebuild on changes
```

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code> Island!</b></i>
</p>