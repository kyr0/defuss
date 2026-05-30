<h1 align="center">

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

`esbuild` + `defuss` - simple pure JS example

</sup>

</h1>

> This example stays in the repo as the reference for compiling `defuss` with a standalone bundler.
> For the default app path in the main packages, prefer Vite 8 with Rolldown underneath.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/kyr0/defuss/tree/main/examples/with-esbuild)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/kyr0/defuss?devcontainer_path=.devcontainer/with-esbuild/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/preview.png)

### ✨ It's amazing!
![tiny](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/build_result.png)

## 🚀 Project Structure

Inside of your `esbuild` + `defuss` project, you'll see the following folders and files:

```text
/
├-- src/
│   ├-- src/
│   │   └-- app.jsx
│   │   └-- app.test.jsx
│   │   └-- index.html
├-- package.json
└-- build.js
└-- vitest.config.js
```

Any static assets, like images, can be placed in the `dist/` directory alongside the built files.

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
| `bun run dev`             | Starts local dev server that runs `esbuild` in watch mode      |
| `bun run build`           | Build your production site to `./dist/`          |
| `bun run preview`         | Builds, then preview your build locally  |
| `bun run test`            | Run tests                                          |
| `bun run test:watch`      | Run tests in watch mode                            |

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on <code>defuss</code> Island!</b></i></caption>
