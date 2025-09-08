import type { Props } from "defuss/jsx-runtime";

export interface HeadProps extends Props {
  meta: Record<string, any>;
}

export const Head = ({ meta }: HeadProps) => {
  return (
    <head>
      <title>{meta.title}</title>
      {/* Include KaTeX CSS to style the rendered math */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />
    </head>
  );
};
