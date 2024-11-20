import { defineConfig } from 'vite';

// import the defuss plugin
import defuss from "defuss-vite"

export default defineConfig({
  // the plugin needs to be integrated so that the transpilation works
  plugins: [defuss()],
});