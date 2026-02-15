// page-vdom type plugin that replaces defuss component use with a custom Hydrate wrapper and adds the runtime script to the end of HTML body
// TODO: support for config option to disable <Hydrate ... /> by default and only use when explicitly imported from "hydrate" subdir

import type { PluginFnPageVdom, SsgConfig, SsgPlugin } from "../types.js";
import type { RenderInput, VNode, VNodeAttributes } from "defuss/jsx-runtime";
import { join, sep } from "node:path";

export const autoHydratePlugin: SsgPlugin<PluginFnPageVdom> = {
  name: "auto-hydrate",
  mode: "both",
  phase: "page-vdom",
  fn: async (
    vdom: VNode,
    _relativeOutputHtmlFilePath: string,
    _projectDir: string,
    config: SsgConfig,
    props: Record<string, any>,
  ) => {
    console.log("Auto Hydrate plugin running... VDOM:");

    const tmp = config.tmp || ".ssg-tmp";
    const components = config.components || "components";
    const tmpComponents = join(tmp, components);

    let foundDefussComponent = false;
    // VDOM is an object that has nested children arrays, so we need to recursively search it
    // once we find an object that has a sourceInfo object with a property fileName that includes tmpComponents somewhere in the path,
    // we stop searching that branch and output the object to the console
    const processDefussComponents = (
      node: RenderInput,
    ): VNode<VNodeAttributes> => {
      if (typeof node === "undefined") {
        return node as never;
      }

      if (Array.isArray(node)) {
        // Fragment
        node.map((child) => processDefussComponents(child));
      } else if (node && typeof node === "object") {
        let clientSrcFile = null;
        if (
          node.sourceInfo &&
          typeof node.sourceInfo === "object" &&
          typeof node.sourceInfo.fileName === "string" &&
          node.sourceInfo.fileName.includes(tmpComponents) &&
          node.type !== "script" && // skip already inserted hydration scripts
          node.type !== "head" && // skip head elements
          node.type !== "link" && // skip head elements
          node.type !== "meta" && // skip head elements
          node.type !== "title" // skip head elements
        ) {
          foundDefussComponent = true;
          clientSrcFile = node.sourceInfo.fileName
            .replaceAll(tmp, "")
            .replaceAll(sep, "/")
            .replace(/\.t?sx?$/, ".js");

          const id = `dh_${Math.random().toString(36).slice(2)}`;

          console.log(`[auto-hydrate] Found component node. type="${node.type}", sourceInfo.fileName="${node.sourceInfo?.fileName}", hasComponentProps=${!!node.componentProps}, componentProps=`, JSON.stringify(node.componentProps)?.slice(0, 300));
          console.log(`[auto-hydrate] Node keys:`, Object.keys(node));

          // Extract serializable component props (set by jsx runtime on function components)
          const componentProps: Record<string, any> = {};
          if (node.componentProps) {
            for (const [key, value] of Object.entries(node.componentProps)) {
              // Skip functions and undefined values — they can't be serialized
              if (typeof value === "function" || typeof value === "undefined") continue;
              try {
                JSON.stringify(value);
                componentProps[key] = value;
              } catch {
                // skip non-serializable values (circular refs, symbols, etc.)
              }
            }
          }

          node = {
            // Hydration wrapper
            type: "div",
            attributes: {
              "data-hydrate-id": id,
              "data-hydrate": "true",
            },
            children: [
              node,
              {
                // Hydration script
                type: "script",
                attributes: { type: "module", id },
                children: [
                  `
                  ;(async function(){

                    const props = ${JSON.stringify(componentProps)};
                    const cacheBust = "?v=" + Date.now();
                    console.log("[hydrate:${id}] Starting hydration, cacheBust=" + cacheBust);
                    console.log("[hydrate:${id}] Importing runtime from /components/runtime.js" + cacheBust);
                    const { hydrate } = await import("/components/runtime.js" + cacheBust);
                    console.log("[hydrate:${id}] Importing component from ${clientSrcFile}" + cacheBust);
                    const expports = (await import("${clientSrcFile}" + cacheBust));

                    console.log("[hydrate:${id}] Module keys:", Object.keys(expports));

                    if (!expports || typeof expports.default !== "function") {
                      console.error("Hydration error: No default export function found in", "${clientSrcFile}");
                      return;
                    }
                    const Component = expports.default;
                    console.log("[hydrate:${id}] Component:", Component.name || "(anonymous)");

                    let roots = null;
                    try {
                      roots = Component(props);
                    } catch(e) {
                     console.error("Error rendering component for hydration:", e);
                     return;
                    }

                    if (!Array.isArray(roots)) {
                      roots = [roots];
                    } else {
                      console.error("Hydration error: Component MUST return a single root element, not an array of elements! (no fragments allowed)");
                    }

                    console.log("[hydrate:${id}] Rendered VDOM roots:", roots.length, JSON.stringify(roots).slice(0, 200));

                    const wrapper = document.querySelector('div[data-hydrate-id="${id}"]');
                    console.log("[hydrate:${id}] Wrapper found:", !!wrapper, wrapper?.childNodes?.length, "children");
                    
                    // remove <script> itself
                    document.getElementById("${id}")?.remove();

                    if (wrapper) {
                      try {
                        hydrate(roots, Array.from(wrapper.childNodes));
                      } catch(e) {
                        console.error("Error during hydration:", e);
                        return;
                      }
                      // unwrap children
                      wrapper.replaceWith(...wrapper.childNodes);
                      console.log("[hydrate:${id}] Hydration complete, wrapper unwrapped");
                    } else {
                      console.warn("No wrapper found for hydration id ${id}");
                    }
                  })();
                  `,
                ],
              },
            ],
          };
        }

        if (!clientSrcFile) {
          if (
            typeof node.children !== "undefined" &&
            Array.isArray(node.children)
          ) {
            for (let i = 0; i < node.children.length; i++) {
              node.children[i] = processDefussComponents(
                node.children[i] as RenderInput,
              );
            }
          }
        }
      }
      return node as VNode<VNodeAttributes>;
    };

    //writeFileSync("./vdom-log.json", JSON.stringify(vdom, null, 2), "utf-8");

    return processDefussComponents(vdom);
  },
};
