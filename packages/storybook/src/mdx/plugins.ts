import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** Remark plugins for MDX processing */
export const remarkPlugins = [
  [remarkFrontmatter, ["yaml", "toml"]],
  [remarkMdxFrontmatter, { name: "meta" }],
  remarkGfm,
  remarkMath,
] as const;

/** Rehype plugins for MDX processing */
export const rehypePlugins = [rehypeKatex] as const;
