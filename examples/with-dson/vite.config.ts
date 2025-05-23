import { defineConfig, type Plugin } from "vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

// import the defuss plugin
import defuss from "defuss-vite";

export default defineConfig({
  // the plugin needs to be integrated so that the transpilation works
  plugins: [defuss() as Plugin],

  css: {
    transformer: "lightningcss",
    lightningcss: {
      targets: browserslistToTargets(browserslist(">= 0.25%")),
    },
  },

  build: {
    target: "esnext",
    cssMinify: "lightningcss",
  },
});
