<h1 align="center">

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

`Astro` + `TypeScript` + `defuss` - SPA / CSR / PWA Example

</sup>

</h1>

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/kyr0/defuss/tree/main/examples/with-astro-spa-csr-pwa)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/kyr0/defuss?devcontainer_path=.devcontainer/with-astro-spa-csr-pwa/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/preview.png)

### ✨ It's amazing!
![tiny](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/build_result.png)

## 🚀 Project Structure

Inside of your `Astro` + `defuss` project, you'll see the following folders and files:

```text
/
├-- public/
│   └-- favicon.svg
│   └-- ...
├-- src/
│   ├-- components/
│   │   └-- App.tsx
│   │   └-- Counter.tsx
│   ├-- layouts/
│   │   └-- Layout.astro
│   │   └-- Layout.css
│   ├-- pages/
│   │   └-- index.astro
│   └-- env.d.ts
├-- package.json
└-- astro.config.ts
└-- tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any `Astro` / `defuss` components.

Any static assets, like images, can be placed in the `public/` directory.

## 🛠️ Setup

### 1. Get a decent package manager

We recommend using `bun` as a package manager. It's fast, mature and handles monorepos well. If you haven't installed `bun` yet:

```bash
npm i -g bun@^1.3.9
```

### 2. Install the projects dependencies

```bash
bun i --frozen
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun run dev`             | Starts local dev server at `localhost:4321`      |
| `bun run build`           | Build your production site to `./dist/`          |
| `bun run preview`         | Preview your build locally, before deploying     |
| `bun run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `bun run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on <code>defuss</code> Island!</b></i></caption>
