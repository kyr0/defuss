// page-vdom type plugin that replaces defuss component use with a custom Hydrate wrapper and adds the runtime script to the end of HTML body
// TODO: support for config option to disable <Hydrate ... /> by default and only use when explicitly imported from "hydrate" subdir

import type { PluginFnPageVdom, SsgConfig, SsgPlugin } from "../types.js";
import type { RenderInput, VNode, VNodeAttributes } from "defuss/jsx-runtime";
import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";

const toStableHydrateId = (seed: string): string => {
	const digest = createHash("sha1").update(seed).digest("hex").slice(0, 12);
	return `dh_${digest}`;
};

export const autoHydratePlugin: SsgPlugin<PluginFnPageVdom> = {
	name: "auto-hydrate",
	mode: "both",
	phase: "page-vdom",
	fn: async (
		vdom: VNode,
		relativeOutputHtmlFilePath: string,
		_projectDir: string,
		config: SsgConfig,
		_props: Record<string, any>,
	) => {
		console.log("Auto Hydrate plugin running... VDOM:");

		const tmp = config.tmp || ".ssg-tmp";
		const components = config.components || "components";
		const tmpComponents = join(tmp, components);
		const tmpComponentsRoot = resolve(tmpComponents);

		let hydrateIndex = 0;
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
				const vnode = node as VNode<VNodeAttributes>;
				let clientSrcFile = null;
				if (
					vnode.sourceInfo &&
					typeof vnode.sourceInfo === "object" &&
					typeof vnode.sourceInfo.fileName === "string" &&
					vnode.sourceInfo.fileName.includes(tmpComponents) &&
					vnode.type !== "script" && // skip already inserted hydration scripts
					vnode.type !== "head" && // skip head elements
					vnode.type !== "link" && // skip head elements
					vnode.type !== "meta" && // skip head elements
					vnode.type !== "title" // skip head elements
				) {
					const sourceFile = resolve(vnode.sourceInfo.fileName);
					const relativeComponentPath = relative(tmpComponentsRoot, sourceFile);

					if (
						relativeComponentPath.startsWith("..") ||
						relativeComponentPath.length === 0
					) {
						throw new Error(
							`[auto-hydrate] Component source file is outside the temp components directory: ${sourceFile}`,
						);
					}

					clientSrcFile = `/${join(components, relativeComponentPath)
						.replaceAll(sep, "/")
						.replace(/\.t?sx?$/, ".js")}`;

					console.log(
						`[auto-hydrate] Found component node. type="${vnode.type}", sourceInfo.fileName="${vnode.sourceInfo?.fileName}", hasComponentProps=${!!vnode.componentProps}, componentProps=`,
						JSON.stringify(vnode.componentProps)?.slice(0, 300),
					);
					console.log(`[auto-hydrate] Node keys:`, Object.keys(vnode));

					// Extract serializable component props (set by jsx runtime on function components)
					const componentProps: Record<string, any> = {};
					if (vnode.componentProps) {
						for (const [key, value] of Object.entries(vnode.componentProps)) {
							// Skip functions and undefined values - they can't be serialized
							if (typeof value === "function" || typeof value === "undefined")
								continue;
							try {
								JSON.stringify(value);
								componentProps[key] = value;
							} catch {
								// skip non-serializable values (circular refs, symbols, etc.)
							}
						}
					}

					const id = toStableHydrateId(
						JSON.stringify({
							clientSrcFile,
							componentProps,
							hydrateIndex: hydrateIndex++,
							relativeOutputHtmlFilePath,
							type: vnode.type,
						}),
					);

					node = {
						// Hydration wrapper
						type: "div",
						attributes: {
							"data-hydrate-id": id,
							"data-hydrate": "true",
						},
						children: [
							vnode,
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
                    const { hydrate } = await import(/* @vite-ignore */ "/components/runtime.js" + cacheBust);
                    console.log("[hydrate:${id}] Importing component from ${clientSrcFile}" + cacheBust);
                    const expports = (await import(/* @vite-ignore */ "${clientSrcFile}" + cacheBust));

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

                    if (wrapper) {
                      const hydratableNodes = Array.from(wrapper.childNodes).filter(function(node) {
                        if (node instanceof HTMLScriptElement) {
                          return false;
                        }

                        if (node.nodeType === Node.COMMENT_NODE) {
                          return false;
                        }

                        if (node.nodeType === Node.TEXT_NODE) {
                          return (node.textContent ?? "").trim().length !== 0;
                        }

                        return true;
                      });

                      console.log("[hydrate:${id}] Hydratable DOM nodes:", hydratableNodes.length);

                      try {
                        hydrate(roots, hydratableNodes);
                      } catch(e) {
                        console.error("Error during hydration:", e);
                        return;
                      }
                      // unwrap children
                      wrapper.replaceWith(...hydratableNodes);
                      console.log("[hydrate:${id}] Hydration complete, wrapper unwrapped");
                    } else {
                      console.warn("No wrapper found for hydration id ${id}");
                    }
                  })();
                  `,
								],
							},
						],
					} as RenderInput;
				}

				if (!clientSrcFile) {
					const v = node as VNode<VNodeAttributes>;
					if (typeof v.children !== "undefined" && Array.isArray(v.children)) {
						for (let i = 0; i < v.children.length; i++) {
							v.children[i] = processDefussComponents(
								v.children[i] as RenderInput,
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
