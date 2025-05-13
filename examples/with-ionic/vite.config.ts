import { defineConfig } from "vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

// import the defuss plugin
import defuss from "defuss-vite";

export default defineConfig({
  // the plugin needs to be integrated so that the transpilation works
  plugins: [defuss()],

  css: {
    transformer: "lightningcss",
    lightningcss: {
      errorRecovery: true,
      targets: browserslistToTargets(browserslist(">= 0.50%")),
    },
  },
  build: {
    cssMinify: "lightningcss",
  },
});
