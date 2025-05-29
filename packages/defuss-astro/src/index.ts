import type {
  AstroIntegration,
  AstroRenderer,
  ContainerRenderer,
  ViteUserConfig,
} from "astro";
import type { Options } from "./types.js";
import defussPlugin from "defuss-vite";
import { fileURLToPath } from "node:url";
import glob from "fast-glob";
import { performance } from "node:perf_hooks";
import { optimize } from "svgo";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { logMessage } from "./log.js";
import { PurgeCSS } from "purgecss";
import { existsSync } from "node:fs";

const getRenderer = (development: boolean): AstroRenderer => ({
  name: "defuss",
  clientEntrypoint: "defuss-astro/client.js",
  serverEntrypoint: "defuss-astro/server.js",
});

export const getContainerRenderer = (): ContainerRenderer => ({
  name: "defuss",
  serverEntrypoint: "defuss-astro/server.js",
});

const minifyAndWriteFile = async (
  cwd: string,
  filename: string,
  type: "css" | "svg",
): Promise<void> => {
  const filePath = join(cwd, filename);
  const fileOrg = await readFile(filePath, "utf8");

  switch (type) {
    case "svg": {
      const fileMin = optimize(fileOrg, {
        multipass: true,
        plugins: [
          {
            name: "preset-default",
            params: {
              overrides: {
                removeViewBox: false,
              },
            },
          },
        ],
      });
      await writeFile(filePath, fileMin.data, "utf-8");
      break;
    }

    case "css": {
      const purgeCSSResult = await new PurgeCSS().purge({
        content: [`${cwd}**/*.html`],
        css: [cwd + filename],
        variables: false,
      });

      for (const result of purgeCSSResult) {
        if (result.file && existsSync(result.file)) {
          await writeFile(result.file, result.css, "utf-8");
        }
      }
      break;
    }
  }
};

export default function ({
  include,
  exclude,
  devtools,
}: Options = {}): AstroIntegration {
  return {
    name: "defuss",
    hooks: {
      "astro:config:setup": async ({
        config,
        addRenderer,
        updateConfig,
        command,
        injectScript,
        injectRoute,
      }) => {
        // add /_defuss/image route
        injectRoute({
          pattern: "/_defuss/image",
          prerender: false,
          entrypoint: "defuss-astro/image-endpoint.js",
        });

        const publicDirPath = fileURLToPath(config.publicDir);

        // enable Astro's HTML compression
        config.compressHTML = true;
        // TODO: check: https://swc.rs/docs/usage/html

        // use CSS classes for scoped styles
        config.scopedStyleStrategy = "class";

        if (!config.vite.build) {
          config.vite.build = {} as ViteUserConfig["build"];
        }

        // use lightningcss for CSS minification
        config.vite.build!.cssMinify = "lightningcss";

        addRenderer(getRenderer(command === "dev"));

        updateConfig({
          vite: {
            optimizeDeps: {
              include: ["defuss-astro/client.js", "defuss-astro/server.js"],
            },
            ssr: {
              noExternal: ["lightningimg-node"],
            },
            plugins: [defussPlugin()],
          },
        });

        /**
				 * if (command === 'dev' && devtools) {
					injectScript('page', 'import "preact/debug";');
				}*/
      },
      "astro:build:done": async ({ dir }) => {
        const start = performance.now();
        const cwd = fileURLToPath(dir);

        const [cssFiles, htmlFiles, svgFiles] = await Promise.all([
          glob("**/*.css", { cwd, ignore: ["**/*-min.css", "**/*.min.css"] }),
          glob("**/*.html", { cwd }),
          glob("**/*.svg", { cwd }),
        ]);

        // SVG files without HTML files are considered as not used (in optimization context) in the project
        // Also, when CSS is not embedded/referenced in HTML files, it is considered as not in-scope for optimization
        if (htmlFiles.length === 0 && svgFiles.length === 0) return;

        logMessage(`✴️ Optimizing ${cssFiles.length} CSS stylesheets`);

        const minifyAndWritePromises = [];

        for (const filename of cssFiles) {
          minifyAndWritePromises.push(minifyAndWriteFile(cwd, filename, "css"));
        }

        logMessage(`✴️ Optimizing ${svgFiles.length} SVG vector graphics`);

        for (const filename of svgFiles) {
          minifyAndWritePromises.push(minifyAndWriteFile(cwd, filename, "svg"));
        }

        await Promise.all(minifyAndWritePromises);

        const end = performance.now();
        const deltaT = end - start;
        const humanTime =
          deltaT < 1000
            ? `${deltaT.toFixed(0)}ms`
            : `${(deltaT / 1000).toFixed(1)}s`;

        logMessage(`✴️ Optimization completed in ${humanTime}`);
      },
    },
  };
}
