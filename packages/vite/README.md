<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

`defuss`

<sup align="center">

Vite plugin

</sup>

</h1>

> `defuss` is a simple, tiny and modern web framework. It stops  **complexity**, promotes **explicit code**, and brings back the **joy** of building for the web! 😊

**💡 Can you imagine?** The whole Vite plugin including it's custom `defuss/render` integration is written in only ~160 Lines of Code.


This package brings the `defuss` experience to any `Vite` project.

<h3 align="center">

How to integrate `defuss` in an existing `Vite` project?

</h3>


**🚀 Looking for a template to start from?** `examples/with-vite-ts` is a Vite project pre-configured to work with `defuss` out-of-the-box.


You're just two steps away from success:

#### 1. Install `defuss-vite`:

```bash
# install a decent package manager
npm i -g bun@^1.3.9

# from your project root folder, add defuss-vite to the devDependencies
npm install --save-dev defuss-vite
```

#### 2. Add `defuss-vite` to your config:

> Create or edit: **vite.config.mjs** or **vite.config.ts**:
```ts
import { defineConfig } from 'vite';

// import the defuss plugin
import defuss from "defuss-vite"

export default defineConfig({
  // add the defuss() plugin to make JSX transpilation work
  plugins: [defuss()]
});
```

<h3 align="center">

🚀 How does `defuss-vite` work?

</h3>

Inside this package, you'll find the following relevant folders and files:

```text
/
├── src/index.ts
├── src/types.ts
├── package.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the plugin. |
| `npm publish`    | Publish a new version of the `defuss-vite` integration package. |

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>