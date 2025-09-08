import type { Props } from "defuss/jsx-runtime";

export interface HeadProps extends Props {
  meta: Record<string, any>;
}

export const Head = ({ meta }: HeadProps) => {
  return (
    <head>
      <title>{meta.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />

      {/* Include Pico.css for basic styling */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      ></link>

      {/* Link to a global stylesheet with helper classes and overrides */}
      <link rel="stylesheet" href="assets/style.css" />

      {/* Include KaTeX CSS to style the rendered math */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />
    </head>
  );
};
