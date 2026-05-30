import pkg from "./package.json";
import { resolve } from "node:path";

const srcDir = resolve(__dirname, "src");

export default {
  rollupOptions: {
    plugins: [
      {
        name: "resolve-jsx-runtime",
        resolveId(id, importer) {
          // Handle jsxImportSource resolution: ./src/render/jsx-runtime
          if (id === "./src/render/jsx-runtime") {
            return resolve(srcDir, "render/jsx-runtime.ts");
          }
          return null;
        },
      },
    ],
    output: {
      // Banner removed - console.log on import breaks pure module expectations
      banner: `// ${pkg.name} v${pkg.version}`,
    },
  },
};
