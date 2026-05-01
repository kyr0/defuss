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

/**
 * Apply auto-hydration wrapping to a VDOM tree.
 * Scans for component nodes (identified by sourceInfo pointing into componentsDir)
 * and wraps them with a hydration wrapper + inline script.
 *
 * @param vdom The root VNode to process
 * @param componentsDir The absolute path to the components directory (source files)
 * @param componentsPublicPrefix The URL prefix for component imports (e.g. "components")
 * @param relativeOutputHtmlFilePath The output HTML file path (for stable ID generation)
 */
export function applyAutoHydrate(
	vdom: VNode,
	componentsDir: string,
	componentsPublicPrefix: string,
	relativeOutputHtmlFilePath: string,
): VNode<VNodeAttributes> {
	const componentsRoot = resolve(componentsDir);

	let hydrateIndex = 0;
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
				vnode.sourceInfo.fileName.includes(componentsDir) &&
				vnode.type !== "script" && // skip already inserted hydration scripts
				vnode.type !== "head" && // skip head elements
				vnode.type !== "link" && // skip head elements
				vnode.type !== "meta" && // skip head elements
				vnode.type !== "title" // skip head elements
			) {
				const sourceFile = resolve(vnode.sourceInfo.fileName);
				const relativeComponentPath = relative(componentsRoot, sourceFile);

				if (
					relativeComponentPath.startsWith("..") ||
					relativeComponentPath.length === 0
				) {
					throw new Error(
						`[auto-hydrate] Component source file is outside the components directory: ${sourceFile}`,
					);
				}

				clientSrcFile = `/${join(componentsPublicPrefix, relativeComponentPath)
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
					// Hydration wrapper - stores metadata for runtime hydration
					type: "div",
					attributes: {
						"data-hydrate-id": id,
						"data-hydrate": "true",
						"data-hydrate-src": clientSrcFile,
						"data-hydrate-props": JSON.stringify(componentProps),
						"data-hydrate-runtime": `/${componentsPublicPrefix}/runtime.js`,
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

                    const cacheBust = "?v=" + Date.now();
                    console.log("[hydrate:${id}] Starting hydration, cacheBust=" + cacheBust);
                    console.log("[hydrate:${id}] Importing runtime from /${componentsPublicPrefix}/runtime.js" + cacheBust);
										const { hydrateBoundary } = await import(/* @vite-ignore */ "/${componentsPublicPrefix}/runtime.js" + cacheBust);
										const boundary = document.querySelector('[data-hydrate-id="${id}"]');

										if (boundary instanceof Element) {
											await hydrateBoundary(boundary, { fromWrapper: true });
										} else {
											console.warn("No hydration boundary found for ${id}");
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

	return processDefussComponents(vdom);
}

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

		return applyAutoHydrate(vdom, tmpComponents, components, relativeOutputHtmlFilePath);
	},
};
