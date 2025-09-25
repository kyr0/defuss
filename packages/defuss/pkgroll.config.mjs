import pkg from "./package.json" assert { type: "json" };

export default {
  rollupOptions: {
    output: {
      banner: `console.log("Running ${pkg.name} v${pkg.version}");`,
    },
  },
};
