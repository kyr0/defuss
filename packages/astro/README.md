<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

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
# install a decent package manager
npm i -g bun@^1.3.9

# from your project root folder, add defuss-astro to the devDependencies
npm install --save-dev defuss-astro
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

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>
