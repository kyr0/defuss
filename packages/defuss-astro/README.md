<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

`defuss`

<sup align="center">

Astro Integration

</sup>

</h1>


> `defuss` is a simple, tiny and modern web framework. It stops  **complexity**, promotes **explicit code**, and brings back the **joy** of building for the web! 😊

**💡 Can you imagine?** The whole Astro Integration including it's custom `defuss/render` integration is written in only ~180 Lines of Code.

This package implements the Astro Integration that uses `defuss-vite` plugin and `defuss/render` to bring the `defuss` experience to Astro.

<h3 align="center">

Integrating `defuss` in an existing Astro project

</h3>

**🚀 Looking for a template to start from?** `examples/with-astro-ts` is an Astro project pre-configured to work with `defuss` out-of-the-box.

If you've arrived here to add `defuss` to your Astro project, you're just two steps away from success:

#### 1. Install `defuss-astro`:

```bash
# from your project root folder, add defuss-astro to the devDependencies
shell > npm install --save-dev defuss-astro
```

#### 2. Integrate `defuss-astro`:

> In **astro.config.mjs** or **astro.config.ts**:
```ts
import { defineConfig } from 'astro/config';

// import our Astro Integration
import defuss from 'defuss-astro';

// https://astro.build/config
export default defineConfig({

  // add the defuss integration
  integrations: [defuss()]
});
```

**Note on Advanced Usage:** `defuss({ ... })` can be called with arguments to `include` and `exclude` files from the underlaying `babel` transpilation. Using the `babel` property, a specific `babel` configuration can be provided. Please find the `DefussPluginOptions` [here]().

<h3 align="center">

🚀 How does `defuss-astro` work?

</h3>

Inside this package, you'll find the following relevant folders and files:

```text
/
├── scripts/finalize-build.ts
├── src/index.ts
├── src/types.ts
├── src/render.ts
├── src/client.ts
├── src/server.ts
├── tsconfig.json
├── LICENSE
├── package.json
```

The `src/index.ts` file is the "entry point" for our Astro Integration. Its default exported function is called in any `astro.config.(mjs|ts)` of any integrating Astro project *(see above)*.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm build`    | Build a new version of the integration. |
| `npm publish`    | Publish a new version of the `defuss-astro` integration package. |

---

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>