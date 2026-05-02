import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";

import type { RenderInput, VNode, VNodeAttributes } from "defuss/jsx-runtime";

const toStableHydrateId = (seed: string): string => {
	const digest = createHash("sha1").update(seed).digest("hex").slice(0, 12);
	return `dh_${digest}`;
};

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
			node.map((child) => processDefussComponents(child));
		} else if (node && typeof node === "object") {
			const vnode = node as VNode<VNodeAttributes>;
			let clientSrcFile: string | null = null;
			if (
				vnode.sourceInfo &&
				typeof vnode.sourceInfo === "object" &&
				typeof vnode.sourceInfo.fileName === "string" &&
				vnode.sourceInfo.fileName.includes(componentsDir) &&
				vnode.type !== "script" &&
				vnode.type !== "head" &&
				vnode.type !== "link" &&
				vnode.type !== "meta" &&
				vnode.type !== "title"
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

				const componentProps: Record<string, any> = {};
				if (vnode.componentProps) {
					for (const [key, value] of Object.entries(vnode.componentProps)) {
						if (typeof value === "function" || typeof value === "undefined") {
							continue;
						}
						try {
							JSON.stringify(value);
							componentProps[key] = value;
						} catch {
							// Skip non-serializable values.
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
				const vnodeWithChildren = node as VNode<VNodeAttributes>;
				if (
					typeof vnodeWithChildren.children !== "undefined" &&
					Array.isArray(vnodeWithChildren.children)
				) {
					for (let i = 0; i < vnodeWithChildren.children.length; i++) {
						vnodeWithChildren.children[i] = processDefussComponents(
							vnodeWithChildren.children[i] as RenderInput,
						);
					}
				}
			}
		}

		return node as VNode<VNodeAttributes>;
	};

	return processDefussComponents(vdom);
}