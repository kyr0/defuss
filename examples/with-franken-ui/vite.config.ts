import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import franken from "franken-ui/plugin-vite";

// import the defuss plugin
import defuss from "defuss-vite";

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // split the franken-ui styles into a separate chunk
          "franken-ui-core": ["franken-ui/js/core.iife"],
          "franken-ui-icons": ["franken-ui/js/icon.iife"],
          // split the uikit styles into a separate chunk
          uikit: ["uikit/dist/js/uikit.js", "uikit/dist/js/uikit-icons.js"],
        },
      },
    },
  },

  // the plugin needs to be integrated so that the transpilation works
  plugins: [
    defuss(),
    franken({
      preflight: false,
      layer: true,
      layerExceptions: ["chart"],
      customPalette: {
        ".uk-theme-emerald": {
          "--background": "160.1 100% 95%",
          "--foreground": "160.1 5% 10%",
          "--card": "160.1 50% 90%",
          "--card-foreground": "160.1 5% 15%",
          "--popover": "160.1 100% 95%",
          "--popover-foreground": "160.1 100% 10%",
          "--primary": "160.1 84.1% 39.4%",
          "--primary-foreground": "0 0% 100%",
          "--secondary": "160.1 30% 70%",
          "--secondary-foreground": "0 0% 0%",
          "--muted": "122.1 30% 85%",
          "--muted-foreground": "160.1 5% 35%",
          "--accent": "122.1 30% 80%",
          "--accent-foreground": "160.1 5% 15%",
          "--destructive": "0 100% 30%",
          "--destructive-foreground": "160.1 5% 90%",
          "--border": "160.1 30% 50%",
          "--input": "160.1 30% 26%",
          "--ring": "160.1 84.1% 39.4%",
        },
        ".dark.uk-theme-emerald": {
          "--background": "160.1 50% 10%",
          "--foreground": "160.1 5% 90%",
          "--card": "160.1 50% 10%",
          "--card-foreground": "160.1 5% 90%",
          "--popover": "160.1 50% 5%",
          "--popover-foreground": "160.1 5% 90%",
          "--primary": "160.1 84.1% 39.4%",
          "--primary-foreground": "0 0% 100%",
          "--secondary": "160.1 30% 20%",
          "--secondary-foreground": "0 0% 100%",
          "--muted": "122.1 30% 25%",
          "--muted-foreground": "160.1 5% 60%",
          "--accent": "122.1 30% 25%",
          "--accent-foreground": "160.1 5% 90%",
          "--destructive": "0 100% 30%",
          "--destructive-foreground": "160.1 5% 90%",
          "--border": "160.1 30% 26%",
          "--input": "160.1 30% 26%",
          "--ring": "160.1 84.1% 39.4%",
        },
      },
    }),
    tailwindcss(),
  ],
});
