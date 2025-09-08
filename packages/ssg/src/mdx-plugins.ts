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
];

// you may import these as defaults in your config file (and extend them)
// like this: import { rehypePlugins as defaultRehypePlugins } from "defuss-ssg";
export const rehypePlugins: RehypePlugins = [
  //rehypeMdxTitle,
  rehypeKatex,
  rehypeStringify,
];
