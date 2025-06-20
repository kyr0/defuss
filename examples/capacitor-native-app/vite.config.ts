import { defineConfig } from "vite";
// import the defuss plugin
import defuss from "defuss-vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

export default defineConfig({
  root: "./src",
  build: {
    outDir: "../dist",
    minify: false,
    emptyOutDir: true,
    cssMinify: "lightningcss",
  },
  plugins: [defuss() as Plugin],

  css: {
    transformer: "lightningcss",
    lightningcss: {
      targets: browserslistToTargets(browserslist(">= 0.25%")),
    },
  },
});
