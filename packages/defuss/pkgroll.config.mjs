import pkg from "./package.json" assert { type: "json" };

export default {
  rollupOptions: {
    output: {
      // Banner removed - console.log on import breaks pure module expectations
      banner: `// ${pkg.name} v${pkg.version}`,
    },
  },
};
