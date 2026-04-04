import type { Ref, VNode, VNodeChild } from "defuss";

export type DefussPrimitive = string | number | boolean | null | undefined;

export interface MarkdownBlockLike {
  id: string;
  node: MarkdownAstNode;
  status?: "pending" | "completed" | string;
}

export interface MarkdownAstNode {
  type: string;
  children?: MarkdownAstNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  spread?: boolean;
  checked?: boolean | null;
  lang?: string | null;
  meta?: string | null;
  url?: string;
  alt?: string;
  title?: string | null;
  align?: Array<"left" | "right" | "center" | null>;
  identifier?: string;
  label?: string | null;
  referenceType?: string;
  name?: string;
  attributes?: Array<{ type?: string; name?: string; value?: string }>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ParserLike {
  append?: (chunk: string) => unknown;
  finalize?: () => unknown;
  render?: (content: string) => unknown;
  reset?: () => void;
  blocks?: MarkdownBlockLike[];
  completedBlocks?: MarkdownBlockLike[];
  pendingBlocks?: MarkdownBlockLike[];
  pendingBlock?: MarkdownBlockLike | null;
  getBlocks?: () => MarkdownBlockLike[];
  getCompletedBlocks?: () => MarkdownBlockLike[];
  [key: string]: unknown;
}

export interface UpdateWithMarkdownOptions {
  parser?: ParserLike;
  createParser?: () => ParserLike | Promise<ParserLike>;
  parserOptions?: Record<string, unknown>;
  render?: (
    jsx: VNodeChild,
    target: Element,
  ) => unknown | Promise<unknown>;
  allowDangerousHtml?: boolean;
  blockWrapper?: (
    block: MarkdownBlockLike,
    rendered: VNodeChild,
  ) => VNodeChild;
  nodeRenderer?: (
    node: MarkdownAstNode,
    context: RenderContext,
  ) => VNodeChild | typeof FALL_THROUGH;
}

export const FALL_THROUGH = Symbol("defuss-markdown:fallback-renderer");

interface RenderContext {
  allowDangerousHtml: boolean;
  nodeRenderer?: UpdateWithMarkdownOptions["nodeRenderer"];
  cellTag?: "td" | "th";
}

interface BlockState {
  order: string[];
  map: Map<string, MarkdownBlockLike>;
}

const DEFAULT_PARSER_OPTIONS = Object.freeze({
  gfm: true,
  math: true,
  htmlTree: true,
  containers: true,
});

export async function updateWithMarkdown(
  target: Element | Ref,
  input: string | Promise<string> | AsyncIterable<string> | AsyncIterator<string>,
  options: UpdateWithMarkdownOptions = {},
): Promise<void> {
  const parser = await getParser(options);
  const state = createBlockState();

  if (isAsyncIterable(input) || isAsyncIterator(input)) {
    for await (const chunk of toAsyncIterable(input)) {
      const update = appendChunk(parser, chunk);
      hydrateStateFromParserOrUpdate(parser, update, state);
      await renderIntoTarget(target, snapshotBlocks(state), options);
    }

    const finalizeUpdate = parser.finalize?.();
    hydrateStateFromParserOrUpdate(parser, finalizeUpdate, state);
    await renderIntoTarget(target, snapshotBlocks(state), options);
    return;
  }

  const content = await input;
  appendChunk(parser, content);
  const finalizeUpdate = parser.finalize?.();
  hydrateStateFromParserOrUpdate(parser, finalizeUpdate, state);
  await renderIntoTarget(target, snapshotBlocks(state), options);
}

async function getParser(options: UpdateWithMarkdownOptions): Promise<ParserLike> {
  if (options.parser) {
    return options.parser;
  }

  if (options.createParser) {
    return await options.createParser();
  }

  const incremark = await dynamicModuleImport("@incremark/core");
  const parserOptions = { ...DEFAULT_PARSER_OPTIONS, ...(options.parserOptions ?? {}) };

  if (typeof incremark?.createIncremarkParser === "function") {
    return incremark.createIncremarkParser(parserOptions);
  }

  if (typeof incremark?.IncremarkParser === "function") {
    return new incremark.IncremarkParser(parserOptions);
  }

  if (typeof incremark?.default === "function") {
    try {
      return new incremark.default(parserOptions);
    } catch {
      return incremark.default(parserOptions);
    }
  }

  throw new Error(
    "Could not construct an Incremark parser. Provide options.parser or options.createParser, or install @incremark/core with either createIncremarkParser() or IncremarkParser exported.",
  );
}

function appendChunk(parser: ParserLike, chunk: string): unknown {
  if (typeof parser.append === "function") {
    return parser.append(chunk);
  }

  if (typeof parser.render === "function") {
    return parser.render(chunk);
  }

  throw new Error("The provided parser does not expose append() or render().");
}

async function renderIntoTarget(
  target: Element | Ref,
  blocks: MarkdownBlockLike[],
  options: UpdateWithMarkdownOptions,
): Promise<void> {
  const jsx = renderBlocks(blocks, options);

  if (isRefLike(target)) {
    const refRenderer = typeof target.render === "function"
      ? target.render
      : typeof target.update === "function"
        ? target.update
        : null;

    if (refRenderer) {
      await refRenderer.call(target, jsx);
      return;
    }

    if (target.current instanceof Element) {
      await renderIntoElement(target.current, jsx, options);
      return;
    }

    throw new Error("Ref target has neither render()/update() nor a current Element.");
  }

  await renderIntoElement(target, jsx, options);
}

async function renderIntoElement(
  target: Element,
  jsx: VNodeChild,
  options: UpdateWithMarkdownOptions,
): Promise<void> {
  if (options.render) {
    await options.render(jsx, target);
    return;
  }

  const defuss = await dynamicModuleImport("defuss");
  const render =
    defuss?.render ?? defuss?.default?.render ?? defuss?.default ?? null;

  if (typeof render !== "function") {
    throw new Error(
      "Could not resolve defuss render(). Provide options.render, or install defuss exporting render().",
    );
  }

  await render(jsx, target);
}

function renderBlocks(
  blocks: MarkdownBlockLike[],
  options: UpdateWithMarkdownOptions,
): VNodeChild {
  const context: RenderContext = {
    allowDangerousHtml: Boolean(options.allowDangerousHtml),
    nodeRenderer: options.nodeRenderer,
  };

  return blocks.map((block) => {
    const rendered = applyBlockKey(
      block.id,
      renderNode(block.node, context),
      block,
    );

    if (typeof options.blockWrapper === "function") {
      return options.blockWrapper(block, rendered);
    }

    return rendered;
  });
}

function renderNode(node: MarkdownAstNode, context: RenderContext): VNodeChild {
  const custom = context.nodeRenderer?.(node, context);
  if (custom !== undefined && custom !== FALL_THROUGH) {
    return custom;
  }

  switch (node.type) {
    case "root":
      return renderChildren(node.children, context);

    case "paragraph":
      return h("p", {}, renderChildren(node.children, context));

    case "heading": {
      const depth = clampHeadingDepth(node.depth);
      return h(`h${depth}`, {}, renderChildren(node.children, context));
    }

    case "text":
      return node.value ?? "";

    case "strong":
      return h("strong", {}, renderChildren(node.children, context));

    case "emphasis":
      return h("em", {}, renderChildren(node.children, context));

    case "delete":
      return h("del", {}, renderChildren(node.children, context));

    case "inlineCode":
      return h("code", {}, node.value ?? "");

    case "code": {
      const className = node.lang ? [`language-${String(node.lang)}`] : [];
      const codeAttrs = className.length > 0 ? { class: className } : {};
      return h("pre", {}, h("code", codeAttrs, node.value ?? ""));
    }

    case "blockquote":
      return h("blockquote", {}, renderChildren(node.children, context));

    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      const attrs: Record<string, unknown> = {};
      if (node.ordered && typeof node.start === "number" && node.start !== 1) {
        attrs.start = node.start;
      }
      return h(tag, attrs, renderChildren(node.children, context));
    }

    case "listItem": {
      const children = [...normalizeChildren(renderChildren(node.children, context))];
      if (typeof node.checked === "boolean") {
        children.unshift(
          h("input", {
            type: "checkbox",
            checked: node.checked,
            disabled: true,
          }),
          " ",
        );
      }
      return h("li", {}, children);
    }

    case "link": {
      const attrs: Record<string, unknown> = { href: node.url ?? "" };
      if (node.title) {
        attrs.title = node.title;
      }
      return h("a", attrs, renderChildren(node.children, context));
    }

    case "image": {
      const attrs: Record<string, unknown> = {
        src: node.url ?? "",
        alt: node.alt ?? "",
      };
      if (node.title) {
        attrs.title = node.title;
      }
      return h("img", attrs);
    }

    case "break":
      return h("br", {});

    case "thematicBreak":
      return h("hr", {});

    case "table":
      return renderTable(node, context);

    case "tableRow":
      return h("tr", {}, renderTableRow(node, context.cellTag ?? "td", context));

    case "tableCell":
      return h(context.cellTag ?? "td", {}, renderChildren(node.children, context));

    case "html": {
      const html = String(node.value ?? "");
      if (!context.allowDangerousHtml) {
        return h("pre", {}, html);
      }
      return h("div", {
        dangerouslySetInnerHTML: { __html: html },
      });
    }

    case "math":
      return h("pre", { class: ["language-math"] }, node.value ?? "");

    case "inlineMath":
      return h("code", { class: ["language-math"] }, node.value ?? "");

    case "footnoteReference": {
      const label = String(node.identifier ?? node.label ?? "fn");
      return h(
        "sup",
        {},
        h("a", { href: `#fn-${label}` }, `[${label}]`),
      );
    }

    case "footnoteDefinition": {
      const label = String(node.identifier ?? node.label ?? "fn");
      return h(
        "div",
        { id: `fn-${label}`, class: ["footnote-definition"] },
        renderChildren(node.children, context),
      );
    }

    case "yaml":
      return h("pre", {}, node.value ?? "");

    case "definition":
      return null;

    default:
      return renderUnknownNode(node, context);
  }
}

function renderUnknownNode(node: MarkdownAstNode, context: RenderContext): VNodeChild {
  if (Array.isArray(node.children) && node.children.length > 0) {
    return h(
      inferWrapperTag(node.type),
      { "data-md-node": node.type },
      renderChildren(node.children, context),
    );
  }

  if (typeof node.value === "string") {
    return h(inferWrapperTag(node.type), { "data-md-node": node.type }, node.value);
  }

  return h(inferWrapperTag(node.type), { "data-md-node": node.type });
}

function renderTable(node: MarkdownAstNode, context: RenderContext): VNodeChild {
  const rows = Array.isArray(node.children) ? node.children : [];
  if (rows.length === 0) {
    return h("table", {});
  }

  const [headerRow, ...bodyRows] = rows;
  const alignments = Array.isArray(node.align) ? node.align : [];

  return h(
    "table",
    {},
    h(
      "thead",
      {},
      renderTableRow(headerRow, "th", { ...context, cellTag: "th" }, alignments),
    ),
    bodyRows.length > 0
      ? h(
          "tbody",
          {},
          bodyRows.map((row) =>
            renderTableRow(row, "td", { ...context, cellTag: "td" }, alignments),
          ),
        )
      : null,
  );
}

function renderTableRow(
  row: MarkdownAstNode,
  cellTag: "td" | "th",
  context: RenderContext,
  alignments: Array<"left" | "right" | "center" | null> = [],
): VNode {
  const cells = Array.isArray(row.children) ? row.children : [];
  return h(
    "tr",
    {},
    cells.map((cell, index) => {
      const align = alignments[index];
      const attrs: Record<string, unknown> = {};
      if (align) {
        attrs.style = { textAlign: align };
      }
      return h(
        cellTag,
        attrs,
        renderChildren(cell.children, { ...context, cellTag }),
      );
    }),
  ) as VNode;
}

function renderChildren(
  children: MarkdownAstNode[] | undefined,
  context: RenderContext,
): VNodeChild[] {
  if (!Array.isArray(children) || children.length === 0) {
    return [];
  }

  return children.map((child) => renderNode(child, context));
}

function applyBlockKey(
  blockId: string,
  rendered: VNodeChild,
  block: MarkdownBlockLike,
): VNodeChild {
  if (isVNode(rendered)) {
    rendered.attributes = {
      ...(rendered.attributes ?? {}),
      key: blockId,
      "data-block-id": blockId,
      "data-block-status": block.status ?? "pending",
    };
    return rendered;
  }

  return h(
    "div",
    {
      key: blockId,
      "data-block-id": blockId,
      "data-block-status": block.status ?? "pending",
    },
    rendered,
  );
}

function createBlockState(): BlockState {
  return {
    order: [],
    map: new Map<string, MarkdownBlockLike>(),
  };
}

function hydrateStateFromParserOrUpdate(
  parser: ParserLike,
  update: unknown,
  state: BlockState,
): void {
  const directSnapshot = extractSnapshotBlocksFromUpdate(update);
  if (directSnapshot) {
    replaceState(state, directSnapshot);
    return;
  }

  const parserSnapshot = extractBlocksFromParser(parser);
  if (parserSnapshot) {
    replaceState(state, parserSnapshot);
    return;
  }

  applyIncrementalCollections(state, update);
}

function extractSnapshotBlocksFromUpdate(update: unknown): MarkdownBlockLike[] | null {
  if (!update || typeof update !== "object") {
    return null;
  }

  const value = update as Record<string, unknown>;
  const direct = pickBlockArray(value.blocks);
  return direct.length > 0 ? direct : null;
}

function extractBlocksFromParser(parser: ParserLike): MarkdownBlockLike[] | null {
  const methodBlocks = pickBlockArray(parser.getBlocks?.());
  if (methodBlocks.length > 0) {
    return methodBlocks;
  }

  const methodMerged = mergeCompletedAndPending(
    pickBlockArray(parser.getCompletedBlocks?.()),
    pickBlockArray(parser.pendingBlocks ?? parser.pendingBlock),
  );
  if (methodMerged.length > 0) {
    return methodMerged;
  }

  const propBlocks = pickBlockArray(parser.blocks);
  if (propBlocks.length > 0) {
    return propBlocks;
  }

  const propMerged = mergeCompletedAndPending(
    pickBlockArray(parser.completedBlocks),
    pickBlockArray(parser.pendingBlocks ?? parser.pendingBlock),
  );
  return propMerged.length > 0 ? propMerged : null;
}

function applyIncrementalCollections(state: BlockState, update: unknown): void {
  if (!update || typeof update !== "object") {
    return;
  }

  const value = update as Record<string, unknown>;
  for (const key of ["completed", "updated", "pending"] as const) {
    for (const block of pickBlockArray(value[key])) {
      upsertBlock(state, block);
    }
  }

  for (const block of pickBlockArray(value.removed)) {
    removeBlock(state, block.id);
  }
}

function replaceState(state: BlockState, blocks: MarkdownBlockLike[]): void {
  state.order = [];
  state.map.clear();
  for (const block of blocks) {
    upsertBlock(state, block);
  }
}

function upsertBlock(state: BlockState, block: MarkdownBlockLike): void {
  if (!state.map.has(block.id)) {
    state.order.push(block.id);
  }
  state.map.set(block.id, block);
}

function removeBlock(state: BlockState, id: string): void {
  state.map.delete(id);
  state.order = state.order.filter((entry) => entry !== id);
}

function snapshotBlocks(state: BlockState): MarkdownBlockLike[] {
  return state.order
    .map((id) => state.map.get(id))
    .filter((block): block is MarkdownBlockLike => Boolean(block));
}

function mergeCompletedAndPending(
  completed: MarkdownBlockLike[],
  pending: MarkdownBlockLike[],
): MarkdownBlockLike[] {
  return [...completed, ...pending];
}

function pickBlockArray(value: unknown): MarkdownBlockLike[] {
  if (Array.isArray(value)) {
    return value.filter(isBlockLike);
  }

  if (isBlockLike(value)) {
    return [value];
  }

  return [];
}

function isBlockLike(value: unknown): value is MarkdownBlockLike {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { id?: unknown }).id === "string" &&
      (value as { node?: unknown }).node &&
      typeof (value as { node?: unknown }).node === "object",
  );
}

// REFACTOR: should be part of defuss
function h(
  type: string,
  attributes: Record<string, unknown> = {},
  ...children: VNodeChild[]
): VNode {
  return {
    type,
    attributes,
    children: normalizeChildren(children),
  };
}

function normalizeChildren(children: VNodeChild[]): VNodeChild[] {
  const normalized: VNodeChild[] = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      normalized.push(...normalizeChildren(child));
      continue;
    }
    if (child === null || child === undefined || typeof child === "boolean") {
      continue;
    }
    normalized.push(child);
  }
  return normalized;
}

function isVNode(value: unknown): value is VNode {
  return Boolean(
    value && typeof value === "object" && typeof (value as VNode).type === "string",
  );
}

function inferWrapperTag(type: string): string {
  if (
    type.includes("block") ||
    type.includes("container") ||
    type.includes("quote") ||
    type.includes("definition")
  ) {
    return "div";
  }
  return "span";
}

function clampHeadingDepth(depth: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  if (typeof depth !== "number" || Number.isNaN(depth)) {
    return 1;
  }
  if (depth < 1) return 1;
  if (depth > 6) return 6;
  return depth as 1 | 2 | 3 | 4 | 5 | 6;
}

function isRefLike(value: unknown): value is Ref {
  return Boolean(value && typeof value === "object" && !(value instanceof Element));
}

function isAsyncIterable(value: unknown): value is AsyncIterable<string> {
  return Boolean(value && typeof (value as AsyncIterable<string>)[Symbol.asyncIterator] === "function");
}

function isAsyncIterator(value: unknown): value is AsyncIterator<string> {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as AsyncIterator<string>).next === "function",
  );
}

async function* toAsyncIterable(
  input: AsyncIterable<string> | AsyncIterator<string>,
): AsyncIterable<string> {
  if (isAsyncIterable(input)) {
    yield* input;
    return;
  }

  while (true) {
    const result = await input.next();
    if (result.done) {
      return;
    }
    yield result.value;
  }
}

async function dynamicModuleImport(specifier: string): Promise<any> {
  return Function("specifier", "return import(specifier)")(specifier);
}
