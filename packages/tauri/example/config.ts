import { mergeConfig } from "vite";
import { viteConfig as currentViteConfig } from "virtual:defuss-ssg/config";

export default {
  pages: "pages",
  output: "dist",
  components: "components",
  viteConfig: mergeConfig(currentViteConfig, {
    server: {
      allowedHosts: ["example-ssg.demo.defuss.tech"],
    },
  }),
};
