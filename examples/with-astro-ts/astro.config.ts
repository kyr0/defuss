import { defineConfig } from 'astro/config';

// importing the defuss-astro integration
import defuss from 'defuss-astro';

// importing the node adapter for SSR, preview mode
import node from '@astrojs/node';

// minification
import minify from "@frontendista/astro-html-minify";
import purgecss from 'astro-purgecss'; // does not work with dynamic routes in Astro 5.x

// https://astro.build/config
export default defineConfig({
  // add the defuss integration to Astro
  integrations: [defuss({
    include: ['src/**/*.tsx'],
  }), /*purgecss(), */minify()],

  // the node adapter allows for server-side rendering and preview mode
  adapter: node({
    mode: 'standalone'
  })
});