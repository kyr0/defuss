// 1. post type plugin that runs tailwindcss to generate a css file based on the content of the input folder with config passed (currying)

import { join } from "node:path";
import type { PluginFnPrePost, SsgPlugin } from "../types.js";

export const tailwindPlugin: SsgPlugin<PluginFnPrePost> = {
  name: "tailwind",
  mode: "both",
  phase: "post",
  fn: async (projectDir: string, { tmp }) => {
    console.log("Tailwind CSS plugin running... 1 DIR:", join(projectDir));

    // const { exec } = await import("node:child_process");
    // const { join } = await import("node:path");
    // const tailwindConfigPath = join(tmp, "tailwind.config.ts");
    // const inputCssPath = join(tmp, "styles.css");
    // const outputCssPath = join(tmp, "styles.css");
    // return new Promise((resolve, reject) => {
    //   const command = `bunx tailwindcss -i ${inputCssPath} -o ${outputCssPath} --config ${tailwindConfigPath} --content "${inputDir}/**/*.{html,js,ts,jsx,tsx,md,mdx}" --minify`;
    //   exec(command, (error, stdout, stderr) => {
    //     if (error) {
    //       console.error(`Error executing Tailwind CSS: ${error.message}`);
    //       return reject(error);
    //     }
    //     if (stderr) {
    //       console.error(`Tailwind CSS stderr: ${stderr}`);
    //     }
    //     if (stdout) {
    //       console.log(`Tailwind CSS stdout: ${stdout}`);
    //     }
    //     console.log("Tailwind CSS generated successfully.");
    //     resolve(options);
    //   });
    // });
  },
};
