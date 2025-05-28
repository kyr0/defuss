<h1 align="center">

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

`photo-canvas` example with <code>Astro</code>, <code>fsLightbox</code> and <code>TypeScript</code>

</sup>

</h1>

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/kyr0/defuss/tree/main/examples/photo-canvas)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/kyr0/defuss?devcontainer_path=.devcontainer/photo-canvas/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/photo-canvas/public/preview.png)

### ✨ It's amazing!
![tiny](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/photo-canvas/public/build_result.png)

## 🚀 Project Structure

Inside of your `Astro` + `fsLightbox` project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
│   └── ...
├── src/
│   ├── components/
│   │   └── PhotoGallery.tsx
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   └── index.astro
│   └── env.d.ts
├── package.json
└── astro.config.ts
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any `Astro` / `defuss` components.

Any static assets, like images, can be placed in the `public/` directory.

## 🛠️ Setup

### 1. Get a decent package manager

We recommend using `pnpm` as a package manager. It's fast, mature and handles monorepos well. If you haven't installed `pnpm` yet:

```bash
npm i -g pnpm@^9.13.2
```

### 2. Install the projects dependencies

```bash
pnpm i --frozen
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm i`             | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-astro-ts/public/defuss_comic.png" />

<caption><i><b>Come visit us on <code>defuss</code> Island!</b></i></caption>