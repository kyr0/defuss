import type { RehypePlugins, RemarkPlugins } from "./types.js";

//import rehypeMdxTitle from "rehype-mdx-title";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
//import { visit } from "unist-util-visit";
//import { mdxJsxNodeToJsonProps } from "./estree.js";
//import { writeFile, writeFileSync } from "node:fs";

/*
const collectJsxComponents = () => (tree: any, vfile: any) => {
  writeFileSync("./jsx-nodes.json", JSON.stringify(tree, null, 2), "utf-8");

  const jsxNodes: any[] = [];
  visit(tree, ["mdxJsxFlowElement"], (node: any) => {
    // TODO: ONLY need the Component names extracted here, in order to register a JSX execution listener
    // in server-side rendering to capture the computed props at render time.
    // We put them on a stack per file and save them as JSON serialized for later use in auto-hydration.

    // TODO: Required upgrading defuss for atomic JSX invocation hooks

    jsxNodes.push(mdxJsxNodeToJsonProps(node)); // node is JSON
  });

  // filter for type to be uppercase first letter (components)
  const componentNodes = jsxNodes.filter(
    (n) => typeof n.type === "string" && /^[A-Z]/.test(n.type),
  );

  console.log("FILE", vfile.history[0]);

  console.log("JSX NODES:");
  console.log(JSON.stringify(componentNodes, null, 2));
};
*/

// like this: import { remarkPlugins as defaultRemarkPlugins } from "defuss-ssg";
export const remarkPlugins: RemarkPlugins = [
  remarkParse,
  // Parse both YAML and TOML (or omit options to default to YAML)
  [remarkFrontmatter, ["yaml", "toml"]],
  // Export each key as an ESM binding: export const title = "…"
  [remarkMdxFrontmatter, { name: "meta" }],
  // GitHub Flavored Markdown (tables, task lists, strikethrough, etc.)
  remarkGfm,

  remarkRehype,

  // Convert $…$ and $$…$$ into math nodes for KaTeX
  remarkMath,

  //collectJsxComponents,
];

// you may import these as defaults in your config file (and extend them)
// like this: import { rehypePlugins as defaultRehypePlugins } from "defuss-ssg";
export const rehypePlugins: RehypePlugins = [
  //rehypeMdxTitle,
  rehypeKatex,
  rehypeStringify,
];
