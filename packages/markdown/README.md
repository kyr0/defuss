# defuss-markdown

Incremental Markdown rendering for Defuss, using Incremark as the parser core.

## Install

```bash
bun add defuss-markdown
```

## Usage

```ts
import { updateWithMarkdown } from "defuss-markdown";

await updateWithMarkdown(containerOrRef, markdownStream);
```

`containerOrRef` can be:

- a DOM `Element`
- a Defuss ref exposing `render(jsx)`
- a Defuss ref exposing `update(jsx)`
- a ref-like object with `current: Element`

`markdownStream` can be:

- `string`
- `Promise<string>`
- `AsyncIterable<string>`
- `AsyncIterator<string>`

## What it does

- streams chunks into Incremark
- tracks incremental block updates
- maps Markdown AST nodes to Defuss-compatible JSX/VNodes
- renders keyed blocks so Defuss can morph incrementally

## API

```ts
async function updateWithMarkdown(
  target: Element | Ref,
  input: string | Promise<string> | AsyncIterable<string> | AsyncIterator<string>,
  options?: UpdateWithMarkdownOptions,
): Promise<void>
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `parser` | `ParserLike` | Inject your own parser instance |
| `createParser` | `() => ParserLike \| Promise<ParserLike>` | Inject a parser factory (sync or async) |
| `parserOptions` | `Record<string, unknown>` | Passed to the default Incremark parser constructor/factory |
| `render` | `(jsx, target) => void` | Custom render function (skips dynamic `defuss` import) |
| `allowDangerousHtml` | `boolean` | Allow raw HTML nodes to use `dangerouslySetInnerHTML` (default: `false`) |
| `blockWrapper` | `(block, rendered) => VNodeChild` | Wrap each rendered block with custom JSX |
| `nodeRenderer` | `(node, context) => VNodeChild \| FALL_THROUGH` | Override or extend node rendering per-node |

### `FALL_THROUGH`

A sentinel symbol exported alongside `updateWithMarkdown`. Return it from a custom `nodeRenderer` to fall back to the built-in renderer for that node:

```ts
import { updateWithMarkdown, FALL_THROUGH } from "defuss-markdown";

await updateWithMarkdown(target, markdown, {
  nodeRenderer: (node) => {
    if (node.type === "paragraph") {
      // Custom paragraph rendering
      return { type: "div", attributes: { class: "custom-p" }, children: [] };
    }
    return FALL_THROUGH; // default rendering for everything else
  },
});
```

### Supported Markdown AST Nodes

The following node types are mapped to Defuss VNodes:

| AST Node | HTML Output |
|----------|-------------|
| `paragraph` | `<p>` |
| `heading` (depth 1-6) | `<h1>`-`<h6>` |
| `text` | text node |
| `strong` | `<strong>` |
| `emphasis` | `<em>` |
| `delete` | `<del>` |
| `inlineCode` | `<code>` |
| `code` | `<pre><code>` (with optional `language-*` class) |
| `blockquote` | `<blockquote>` |
| `list` | `<ul>` or `<ol>` (with `start` attr) |
| `listItem` | `<li>` (with `<input type="checkbox">` when `checked` is boolean) |
| `link` | `<a>` |
| `image` | `<img>` |
| `break` | `<br>` |
| `thematicBreak` | `<hr>` |
| `table` | `<table>` with `<thead>`/`<tbody>`, cell alignment via `style` |
| `html` | `<pre>` (safe) or `<div dangerouslySetInnerHTML>` (when allowed) |
| `math` | `<pre class="language-math">` |
| `inlineMath` | `<code class="language-math">` |
| `footnoteReference` | `<sup><a href="#fn-{id}">` |
| `footnoteDefinition` | `<div id="fn-{id}" class="footnote-definition">` |
| `yaml` | `<pre>` |
| `definition` | _(omitted)_ |
| `root` | children rendered directly |
| unknown | `<div>` or `<span>` with `data-md-node` attr |

### Parser Interface (`ParserLike`)

Any object satisfying `ParserLike` can be injected. The library reads blocks through multiple fallback paths:

1. `parser.getBlocks()` method
2. `parser.getCompletedBlocks()` + `parser.pendingBlock` / `parser.pendingBlocks`
3. `parser.blocks` property
4. `parser.completedBlocks` + `parser.pendingBlocks` / `parser.pendingBlock`
5. Incremental update objects returned from `append()` with `completed` / `pending` / `updated` / `removed` keys

The parser must expose at least one of `append(chunk)` or `render(content)`.

### Streaming Example

```ts
import { updateWithMarkdown } from "defuss-markdown";

const stream = async function* () {
  yield "# Hello\n\n";
  yield "This is **streamed** markdown.\n";
};

await updateWithMarkdown(containerEl, stream(), {
  render: (jsx, target) => myRender(jsx, target),
});
```

## Notes

By default the package tries to resolve either:

- `createIncremarkParser(...)` from `@incremark/core`
- `new IncremarkParser(...)` from `@incremark/core`

and then uses Defuss `render(...)` for Element targets.

For fully controlled environments, inject both the parser and render function through `options`.

## Development

```bash
bun install
bun test
bun run test:coverage   # with v8 coverage report (text + html + lcov)
bun run build
```

Coverage reports are generated in the `coverage/` directory.
