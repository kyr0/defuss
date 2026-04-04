import { describe, expect, it, vi } from "vitest";
import { updateWithMarkdown, FALL_THROUGH } from "../src/index.js";
import type { MarkdownAstNode, MarkdownBlockLike, ParserLike } from "../src/index.js";

// ---------------------------------------------------------------------------
// Polyfills & helpers
// ---------------------------------------------------------------------------

class FakeElement {}

(globalThis as any).Element = FakeElement;

interface Step {
  blocks: MarkdownBlockLike[];
  update?: unknown;
}

class FakeParser implements ParserLike {
  [key: string]: unknown;
  public blocks: MarkdownBlockLike[] = [];
  private readonly steps: Step[];
  private readonly finalizeStep?: Step;
  private index = 0;

  constructor(steps: Step[], finalizeStep?: Step) {
    this.steps = steps;
    this.finalizeStep = finalizeStep;
  }

  append(): unknown {
    const step = this.steps[this.index++] ?? this.steps[this.steps.length - 1];
    this.blocks = step?.blocks ?? [];
    return step?.update;
  }

  finalize(): unknown {
    if (this.finalizeStep) {
      this.blocks = this.finalizeStep.blocks;
      return this.finalizeStep.update;
    }
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// AST node factories
// ---------------------------------------------------------------------------

const text = (value: string): MarkdownAstNode => ({ type: "text", value });
const paragraph = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "paragraph",
  children,
});
const strong = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "strong",
  children,
});
const emphasis = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "emphasis",
  children,
});
const del = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "delete",
  children,
});
const inlineCode = (value: string): MarkdownAstNode => ({
  type: "inlineCode",
  value,
});
const list = (...items: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "list",
  ordered: false,
  children: items,
});
const orderedList = (start: number, ...items: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "list",
  ordered: true,
  start,
  children: items,
});
const listItem = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "listItem",
  children,
});
const checkboxItem = (checked: boolean, ...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "listItem",
  checked,
  children,
});
const code = (value: string, lang?: string): MarkdownAstNode => ({
  type: "code",
  value,
  lang,
});
const heading = (depth: number, ...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "heading",
  depth,
  children,
});
const blockquote = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "blockquote",
  children,
});
const link = (url: string, title: string | null, ...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "link",
  url,
  title,
  children,
});
const image = (url: string, alt: string, title?: string | null): MarkdownAstNode => ({
  type: "image",
  url,
  alt,
  title,
});
const html = (value: string): MarkdownAstNode => ({
  type: "html",
  value,
});
const thematicBreak = (): MarkdownAstNode => ({ type: "thematicBreak" });
const lineBreak = (): MarkdownAstNode => ({ type: "break" });
const root = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "root",
  children,
});
const math = (value: string): MarkdownAstNode => ({ type: "math", value });
const inlineMath = (value: string): MarkdownAstNode => ({ type: "inlineMath", value });
const yaml = (value: string): MarkdownAstNode => ({ type: "yaml", value });
const definition = (): MarkdownAstNode => ({ type: "definition", identifier: "ref1", url: "http://example.com" });
const footnoteRef = (id: string): MarkdownAstNode => ({ type: "footnoteReference", identifier: id });
const footnoteDef = (id: string, ...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "footnoteDefinition",
  identifier: id,
  children,
});
const tableNode = (
  align: Array<"left" | "right" | "center" | null>,
  ...rows: MarkdownAstNode[]
): MarkdownAstNode => ({
  type: "table",
  align,
  children: rows,
});
const tableRow = (...cells: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "tableRow",
  children: cells,
});
const tableCell = (...children: MarkdownAstNode[]): MarkdownAstNode => ({
  type: "tableCell",
  children,
});
const unknownNode = (type: string, opts?: { children?: MarkdownAstNode[]; value?: string }): MarkdownAstNode => ({
  type,
  ...opts,
});

const block = (
  id: string,
  node: MarkdownAstNode,
  status: MarkdownBlockLike["status"] = "completed",
): MarkdownBlockLike => ({ id, node, status });

function streamOf(...chunks: string[]): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

function iteratorOf(...chunks: string[]): AsyncIterator<string> {
  let i = 0;
  return {
    async next() {
      if (i < chunks.length) {
        return { done: false as const, value: chunks[i++] };
      }
      return { done: true as const, value: undefined };
    },
  };
}

function simplify(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((child) => simplify(child));
  }
  if (typeof node === "string" || typeof node === "number") {
    return node;
  }
  if (!node || typeof node !== "object") {
    return node;
  }

  const vnode = node as { type?: string; attributes?: Record<string, unknown>; children?: unknown[] };
  const attrs = { ...(vnode.attributes ?? {}) } as Record<string, unknown>;
  return {
    type: vnode.type,
    key: attrs.key,
    attrs,
    children: simplify(vnode.children ?? []),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateWithMarkdown", () => {
  // ---- basic rendering ----

  it("renders a complete string input into Defuss-compatible JSX", async () => {
    const parser = new FakeParser([
      {
        blocks: [
          block(
            "b1",
            paragraph(text("Hello "), strong(text("world"))),
            "completed",
          ),
        ],
      },
    ]);

    const target = new FakeElement() as unknown as Element;
    const render = vi.fn();

    await updateWithMarkdown(target, "Hello **world**", {
      parser,
      render,
    });

    expect(render).toHaveBeenCalledTimes(1);
    expect(simplify(render.mock.calls[0]?.[0])).toEqual([
      {
        type: "p",
        key: "b1",
        attrs: {
          key: "b1",
          "data-block-id": "b1",
          "data-block-status": "completed",
        },
        children: [
          "Hello ",
          {
            type: "strong",
            key: undefined,
            attrs: {},
            children: ["world"],
          },
        ],
      },
    ]);
  });

  // ---- streaming ----

  it("re-renders incrementally for streamed chunks while preserving block keys", async () => {
    const parser = new FakeParser(
      [
        {
          blocks: [block("p-1", paragraph(text("Hel")), "pending")],
        },
        {
          blocks: [block("p-1", paragraph(text("Hello")), "pending")],
        },
      ],
      {
        blocks: [block("p-1", paragraph(text("Hello")), "completed")],
      },
    );

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, streamOf("Hel", "lo"), {
      parser,
      render,
    });

    expect(render).toHaveBeenCalledTimes(3);

    const first = simplify(render.mock.calls[0]?.[0]) as any[];
    const second = simplify(render.mock.calls[1]?.[0]) as any[];
    const final = simplify(render.mock.calls[2]?.[0]) as any[];

    expect(first[0].key).toBe("p-1");
    expect(second[0].key).toBe("p-1");
    expect(final[0].key).toBe("p-1");
    expect(first[0].attrs["data-block-status"]).toBe("pending");
    expect(final[0].attrs["data-block-status"]).toBe("completed");
    expect(second[0].children).toEqual(["Hello"]);
  });

  it("handles AsyncIterator (not just AsyncIterable)", async () => {
    const parser = new FakeParser(
      [
        { blocks: [block("p-1", paragraph(text("A")), "pending")] },
        { blocks: [block("p-1", paragraph(text("AB")), "pending")] },
      ],
      { blocks: [block("p-1", paragraph(text("AB")), "completed")] },
    );

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, iteratorOf("A", "B"), {
      parser,
      render,
    });

    expect(render).toHaveBeenCalledTimes(3);
    const final = simplify(render.mock.calls[2]?.[0]) as any[];
    expect(final[0].attrs["data-block-status"]).toBe("completed");
  });

  // ---- multiple blocks ----

  it("maps multiple blocks into stable keyed JSX in source order", async () => {
    const parser = new FakeParser([
      {
        blocks: [
          block("p-1", paragraph(text("Intro")), "completed"),
          block(
            "list-1",
            list(
              listItem(paragraph(text("One"))),
              listItem(paragraph(text("Two"))),
            ),
            "completed",
          ),
          block("code-1", code("const x = 1", "ts"), "pending"),
        ],
      },
    ]);

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, Promise.resolve("ignored"), {
      parser,
      render,
    });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output.map((entry) => entry.key)).toEqual(["p-1", "list-1", "code-1"]);
    expect(output[1].type).toBe("ul");
    expect(output[2]).toEqual({
      type: "pre",
      key: "code-1",
      attrs: {
        key: "code-1",
        "data-block-id": "code-1",
        "data-block-status": "pending",
      },
      children: [
        {
          type: "code",
          key: undefined,
          attrs: { class: ["language-ts"] },
          children: ["const x = 1"],
        },
      ],
    });
  });

  // ---- ref targets ----

  it("prefers ref.update() and can emit dangerous HTML when enabled", async () => {
    const parser = new FakeParser([
      {
        blocks: [block("html-1", html("<span>safe enough</span>"), "completed")],
      },
    ]);

    const update = vi.fn();
    const ref = {
      current: null,
      update,
    } as unknown as Element;

    await updateWithMarkdown(ref, "<span>safe enough</span>", {
      parser,
      allowDangerousHtml: true,
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(simplify(update.mock.calls[0]?.[0])).toEqual([
      {
        type: "div",
        key: "html-1",
        attrs: {
          key: "html-1",
          "data-block-id": "html-1",
          "data-block-status": "completed",
          dangerouslySetInnerHTML: { __html: "<span>safe enough</span>" },
        },
        children: [],
      },
    ]);
  });

  it("uses ref.render() when available", async () => {
    const parser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Hi")), "completed")] },
    ]);

    const renderFn = vi.fn();
    const ref = { current: null, render: renderFn } as unknown as Element;

    await updateWithMarkdown(ref, "Hi", { parser });

    expect(renderFn).toHaveBeenCalledTimes(1);
  });

  it("falls back to ref.current (Element) when no render/update on ref", async () => {
    const parser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Hi")), "completed")] },
    ]);

    const renderFn = vi.fn();
    const fakeEl = new FakeElement() as unknown as Element;
    const ref = { current: fakeEl } as unknown as Element;

    await updateWithMarkdown(ref, "Hi", { parser, render: renderFn });

    expect(renderFn).toHaveBeenCalledTimes(1);
    expect(renderFn.mock.calls[0]?.[1]).toBe(fakeEl);
  });

  it("throws when ref has neither render/update nor current Element", async () => {
    const parser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Hi")), "completed")] },
    ]);

    const ref = { current: null } as unknown as Element;

    await expect(
      updateWithMarkdown(ref, "Hi", { parser }),
    ).rejects.toThrow("Ref target has neither render()/update() nor a current Element.");
  });

  // ---- createParser option ----

  it("uses createParser factory when no parser is given", async () => {
    const fakeParser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Created")), "completed")] },
    ]);
    const createParser = vi.fn(() => fakeParser);
    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "Created", { createParser, render });

    expect(createParser).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("supports async createParser factory", async () => {
    const fakeParser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Async")), "completed")] },
    ]);
    const createParser = vi.fn(async () => fakeParser);
    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "Async", { createParser, render });

    expect(createParser).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  // ---- parser.render() fallback ----

  it("falls back to parser.render() when append() is absent", async () => {
    const renderParserFn = vi.fn();
    const parserWithRender: ParserLike = {
      render: renderParserFn,
      finalize: () => undefined,
      blocks: [block("b1", paragraph(text("Via render")), "completed")],
    };

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "Via render", { parser: parserWithRender, render });

    expect(renderParserFn).toHaveBeenCalledWith("Via render");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("throws when parser has neither append() nor render()", async () => {
    const badParser: ParserLike = {
      finalize: () => undefined,
      blocks: [],
    };

    const target = new FakeElement() as unknown as Element;

    await expect(
      updateWithMarkdown(target, "fail", { parser: badParser, render: vi.fn() }),
    ).rejects.toThrow("does not expose append() or render()");
  });

  // ---- blockWrapper ----

  it("applies blockWrapper to each rendered block", async () => {
    const parser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Wrapped")), "completed")] },
    ]);

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "Wrapped", {
      parser,
      render,
      blockWrapper: (_block, rendered) => ({
        type: "section",
        attributes: { class: "custom-wrapper" },
        children: [rendered],
      }),
    });

    expect(render).toHaveBeenCalledTimes(1);
    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output[0].type).toBe("section");
    expect(output[0].attrs.class).toBe("custom-wrapper");
  });

  // ---- nodeRenderer + FALL_THROUGH ----

  it("uses custom nodeRenderer to override specific node types", async () => {
    const parser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Custom")), "completed")] },
    ]);

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "Custom", {
      parser,
      render,
      nodeRenderer: (node) => {
        if (node.type === "paragraph") {
          return { type: "div", attributes: { class: "custom-p" }, children: [node.children?.[0]?.value ?? ""] };
        }
        return FALL_THROUGH;
      },
    });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output[0].type).toBe("div");
    expect(output[0].attrs.class).toBe("custom-p");
  });

  it("FALL_THROUGH causes default rendering", async () => {
    const parser = new FakeParser([
      { blocks: [block("b1", paragraph(text("Default")), "completed")] },
    ]);

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "Default", {
      parser,
      render,
      nodeRenderer: () => FALL_THROUGH,
    });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output[0].type).toBe("p");
    expect(output[0].children).toEqual(["Default"]);
  });

  // ---- incremental update via returned update objects ----

  it("handles incremental updates with completed/updated/pending/removed keys", async () => {
    const b1 = block("b1", paragraph(text("First")), "completed");
    const b2 = block("b2", paragraph(text("Second")), "completed");
    const b3 = block("b3", paragraph(text("Third")), "pending");

    // For streaming input, append() return values are fed through hydration
    let callIndex = 0;
    const parserNoBlocks: ParserLike = {
      append: () => {
        callIndex++;
        if (callIndex === 1) {
          return { completed: [b1, b2], pending: [b3] };
        }
        return undefined;
      },
      finalize: () => ({
        removed: [{ id: "b3", node: { type: "paragraph" } }],
      }),
    };

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    // Use streaming so append() return values are processed incrementally
    await updateWithMarkdown(target, streamOf("chunk1", "chunk2"), { parser: parserNoBlocks, render });

    // 2 append calls + 1 finalize = 3 renders
    expect(render).toHaveBeenCalledTimes(3);
    // After finalize, b3 was removed
    const finalOutput = simplify(render.mock.calls[2]?.[0]) as any[];
    expect(finalOutput).toHaveLength(2);
    expect(finalOutput.map((e: any) => e.key)).toEqual(["b1", "b2"]);
  });

  // ---- parser.getBlocks() path ----

  it("reads blocks from parser.getBlocks() method", async () => {
    const parserWithGetBlocks: ParserLike = {
      append: () => undefined,
      finalize: () => undefined,
      getBlocks: () => [block("gb1", paragraph(text("FromGetBlocks")), "completed")],
    };

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "test", { parser: parserWithGetBlocks, render });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output[0].key).toBe("gb1");
  });

  // ---- parser.getCompletedBlocks() + pendingBlock path ----

  it("merges getCompletedBlocks() with pendingBlock", async () => {
    const parserWithCompletedAndPending: ParserLike = {
      append: () => undefined,
      finalize: () => undefined,
      getCompletedBlocks: () => [block("c1", paragraph(text("Completed")), "completed")],
      pendingBlock: block("p1", paragraph(text("Pending...")), "pending"),
    };

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "test", { parser: parserWithCompletedAndPending, render });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output).toHaveLength(2);
    expect(output[0].key).toBe("c1");
    expect(output[1].key).toBe("p1");
  });

  // ---- parser.completedBlocks + pendingBlocks path ----

  it("uses completedBlocks property when getCompletedBlocks is absent", async () => {
    // completedBlocks (property path) is only reached when neither
    // getBlocks(), getCompletedBlocks(), nor blocks are set.
    // pendingBlocks gets consumed by the method-merged check first,
    // so test completedBlocks alone to exercise the propMerged path.
    const parserWithProps: ParserLike = {
      append: () => undefined,
      finalize: () => undefined,
      completedBlocks: [block("c1", paragraph(text("Done")), "completed")],
    };

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "test", { parser: parserWithProps, render });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output).toHaveLength(1);
    expect(output[0].key).toBe("c1");
  });

  it("pendingBlocks property is picked up via method-merged path", async () => {
    // pendingBlocks is checked in the method-merged path alongside
    // getCompletedBlocks(), so it gets consumed even without getCompletedBlocks
    const parserWithPending: ParserLike = {
      append: () => undefined,
      finalize: () => undefined,
      pendingBlocks: [block("p1", paragraph(text("WIP")), "pending")],
    };

    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "test", { parser: parserWithPending, render });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output).toHaveLength(1);
    expect(output[0].key).toBe("p1");
  });
});

// ---------------------------------------------------------------------------
// AST node rendering
// ---------------------------------------------------------------------------

describe("node rendering", () => {
  async function renderSingleBlock(node: MarkdownAstNode, opts: { allowDangerousHtml?: boolean } = {}): Promise<any> {
    const parser = new FakeParser([
      { blocks: [block("b", node, "completed")] },
    ]);
    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;
    await updateWithMarkdown(target, "x", { parser, render, ...opts });
    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    return output[0];
  }

  it("renders headings h1-h6", async () => {
    for (const depth of [1, 2, 3, 4, 5, 6]) {
      const result = await renderSingleBlock(heading(depth, text(`H${depth}`)));
      expect(result.type).toBe(`h${depth}`);
      expect(result.children).toEqual([`H${depth}`]);
    }
  });

  it("clamps heading depth to 1-6", async () => {
    const h0 = await renderSingleBlock(heading(0, text("Too low")));
    expect(h0.type).toBe("h1");

    const h7 = await renderSingleBlock(heading(7, text("Too high")));
    expect(h7.type).toBe("h6");

    // NaN depth defaults to h1
    const hNaN = await renderSingleBlock({ type: "heading", depth: undefined as any, children: [text("NaN")] });
    expect(hNaN.type).toBe("h1");
  });

  it("renders emphasis as <em>", async () => {
    const result = await renderSingleBlock(emphasis(text("italic")));
    expect(result.type).toBe("em");
    expect(result.children).toEqual(["italic"]);
  });

  it("renders delete as <del>", async () => {
    const result = await renderSingleBlock(del(text("struck")));
    expect(result.type).toBe("del");
    expect(result.children).toEqual(["struck"]);
  });

  it("renders inlineCode as <code>", async () => {
    const result = await renderSingleBlock(paragraph(inlineCode("x = 1")));
    expect(result.children[0].type).toBe("code");
    expect(result.children[0].children).toEqual(["x = 1"]);
  });

  it("renders code block without lang", async () => {
    const result = await renderSingleBlock(code("let a = 1"));
    expect(result.type).toBe("pre");
    expect(result.children[0].type).toBe("code");
    expect(result.children[0].attrs.class).toBeUndefined();
    expect(result.children[0].children).toEqual(["let a = 1"]);
  });

  it("renders code block with language class", async () => {
    const result = await renderSingleBlock(code("fn main()", "rust"));
    expect(result.children[0].attrs.class).toEqual(["language-rust"]);
  });

  it("renders blockquote", async () => {
    const result = await renderSingleBlock(blockquote(paragraph(text("Quote"))));
    expect(result.type).toBe("blockquote");
    expect(result.children[0].type).toBe("p");
  });

  it("renders ordered list with start number", async () => {
    const result = await renderSingleBlock(orderedList(3, listItem(paragraph(text("Third")))));
    expect(result.type).toBe("ol");
    expect(result.attrs.start).toBe(3);
  });

  it("renders ordered list starting at 1 without explicit start attr", async () => {
    const result = await renderSingleBlock(orderedList(1, listItem(paragraph(text("First")))));
    expect(result.type).toBe("ol");
    expect(result.attrs.start).toBeUndefined();
  });

  it("renders checkbox list items", async () => {
    const result = await renderSingleBlock(
      list(
        checkboxItem(true, paragraph(text("Done"))),
        checkboxItem(false, paragraph(text("Todo"))),
      ),
    );
    expect(result.type).toBe("ul");
    const li1 = result.children[0];
    expect(li1.type).toBe("li");
    expect(li1.children[0].type).toBe("input");
    expect(li1.children[0].attrs.checked).toBe(true);
    expect(li1.children[0].attrs.disabled).toBe(true);
    expect(li1.children[1]).toBe(" ");
  });

  it("renders links with title", async () => {
    const result = await renderSingleBlock(
      paragraph(link("https://example.com", "Example", text("Click"))),
    );
    const a = result.children[0];
    expect(a.type).toBe("a");
    expect(a.attrs.href).toBe("https://example.com");
    expect(a.attrs.title).toBe("Example");
    expect(a.children).toEqual(["Click"]);
  });

  it("renders links without title", async () => {
    const result = await renderSingleBlock(
      paragraph(link("https://example.com", null, text("Click"))),
    );
    const a = result.children[0];
    expect(a.attrs.title).toBeUndefined();
  });

  it("renders images with title", async () => {
    const result = await renderSingleBlock(
      paragraph(image("photo.jpg", "A photo", "My Photo")),
    );
    const img = result.children[0];
    expect(img.type).toBe("img");
    expect(img.attrs.src).toBe("photo.jpg");
    expect(img.attrs.alt).toBe("A photo");
    expect(img.attrs.title).toBe("My Photo");
  });

  it("renders images without title", async () => {
    const result = await renderSingleBlock(
      paragraph(image("photo.jpg", "A photo")),
    );
    const img = result.children[0];
    expect(img.attrs.title).toBeUndefined();
  });

  it("renders <br>", async () => {
    const result = await renderSingleBlock(paragraph(text("a"), lineBreak(), text("b")));
    expect(result.children[1].type).toBe("br");
  });

  it("renders <hr>", async () => {
    const result = await renderSingleBlock(thematicBreak());
    expect(result.type).toBe("hr");
  });

  it("renders root node by returning children directly", async () => {
    const result = await renderSingleBlock(root(paragraph(text("Inside root"))));
    // root renders its children, which is an array; applyBlockKey wraps non-VNode in div
    expect(result.type).toBe("div");
  });

  it("renders HTML as <pre> when allowDangerousHtml is false", async () => {
    const result = await renderSingleBlock(html("<b>bold</b>"));
    expect(result.type).toBe("pre");
    expect(result.children).toEqual(["<b>bold</b>"]);
  });

  it("renders HTML with dangerouslySetInnerHTML when allowed", async () => {
    const result = await renderSingleBlock(html("<b>bold</b>"), { allowDangerousHtml: true });
    expect(result.type).toBe("div");
    expect(result.attrs.dangerouslySetInnerHTML).toEqual({ __html: "<b>bold</b>" });
  });

  it("renders math block", async () => {
    const result = await renderSingleBlock(math("E = mc^2"));
    expect(result.type).toBe("pre");
    expect(result.attrs.class).toEqual(["language-math"]);
    expect(result.children).toEqual(["E = mc^2"]);
  });

  it("renders inline math", async () => {
    const result = await renderSingleBlock(paragraph(inlineMath("x^2")));
    const codeEl = result.children[0];
    expect(codeEl.type).toBe("code");
    expect(codeEl.attrs.class).toEqual(["language-math"]);
    expect(codeEl.children).toEqual(["x^2"]);
  });

  it("renders footnote reference", async () => {
    const result = await renderSingleBlock(paragraph(footnoteRef("1")));
    const sup = result.children[0];
    expect(sup.type).toBe("sup");
    expect(sup.children[0].type).toBe("a");
    expect(sup.children[0].attrs.href).toBe("#fn-1");
    expect(sup.children[0].children).toEqual(["[1]"]);
  });

  it("renders footnote definition", async () => {
    const result = await renderSingleBlock(footnoteDef("1", paragraph(text("Footnote text"))));
    expect(result.type).toBe("div");
    expect(result.attrs.id).toBe("fn-1");
    expect(result.attrs.class).toEqual(["footnote-definition"]);
  });

  it("renders yaml as <pre>", async () => {
    const result = await renderSingleBlock(yaml("title: Test"));
    expect(result.type).toBe("pre");
    expect(result.children).toEqual(["title: Test"]);
  });

  it("renders definition as null (wrapped in div)", async () => {
    const result = await renderSingleBlock(definition());
    // definition returns null, applyBlockKey wraps it in div
    expect(result.type).toBe("div");
  });

  it("renders unknown node with children", async () => {
    const result = await renderSingleBlock(unknownNode("custom-block", { children: [text("inside")] }));
    // "custom-block" contains "block" so inferWrapperTag returns "div"
    expect(result.attrs["data-md-node"]).toBe("custom-block");
    expect(result.children).toEqual(["inside"]);
  });

  it("renders unknown node with value", async () => {
    const result = await renderSingleBlock(unknownNode("mystery", { value: "raw value" }));
    expect(result.type).toBe("span");
    expect(result.attrs["data-md-node"]).toBe("mystery");
    expect(result.children).toEqual(["raw value"]);
  });

  it("renders unknown node with no children or value", async () => {
    const result = await renderSingleBlock(unknownNode("empty-container"));
    // "empty-container" contains "container" so inferWrapperTag returns "div"
    expect(result.type).toBe("div");
    expect(result.attrs["data-md-node"]).toBe("empty-container");
    expect(result.children).toEqual([]);
  });

  // ---- table rendering ----

  it("renders a table with header and body rows", async () => {
    const table = tableNode(
      ["left", "right"],
      tableRow(tableCell(text("Name")), tableCell(text("Age"))),
      tableRow(tableCell(text("Alice")), tableCell(text("30"))),
      tableRow(tableCell(text("Bob")), tableCell(text("25"))),
    );
    const result = await renderSingleBlock(table);
    expect(result.type).toBe("table");

    const thead = result.children[0];
    expect(thead.type).toBe("thead");

    const tbody = result.children[1];
    expect(tbody.type).toBe("tbody");
    expect(tbody.children).toHaveLength(2);
  });

  it("renders a table with alignment styles", async () => {
    const table = tableNode(
      ["left", "center", null],
      tableRow(tableCell(text("A")), tableCell(text("B")), tableCell(text("C"))),
      tableRow(tableCell(text("1")), tableCell(text("2")), tableCell(text("3"))),
    );
    const result = await renderSingleBlock(table);

    const bodyRow = result.children[1].children[0];
    expect(bodyRow.children[0].attrs.style).toEqual({ textAlign: "left" });
    expect(bodyRow.children[1].attrs.style).toEqual({ textAlign: "center" });
    expect(bodyRow.children[2].attrs.style).toBeUndefined();
  });

  it("renders empty table", async () => {
    const table: MarkdownAstNode = { type: "table", children: [] };
    const result = await renderSingleBlock(table);
    expect(result.type).toBe("table");
    expect(result.children).toEqual([]);
  });

  it("renders header-only table (no body rows)", async () => {
    const table = tableNode(
      [],
      tableRow(tableCell(text("Only Header"))),
    );
    const result = await renderSingleBlock(table);
    expect(result.type).toBe("table");
    expect(result.children[0].type).toBe("thead");
    // tbody is null, filtered out by normalizeChildren
    expect(result.children).toHaveLength(1);
  });

  // ---- applyBlockKey wrapping ----

  it("wraps non-VNode block output in a keyed div (text block)", async () => {
    const parser = new FakeParser([
      { blocks: [block("t1", text("plain"), "completed")] },
    ]);
    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "x", { parser, render });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output[0].type).toBe("div");
    expect(output[0].key).toBe("t1");
    expect(output[0].children).toEqual(["plain"]);
  });

  // ---- block status defaults ----

  it("defaults block status to 'pending' when not set", async () => {
    const blockNoStatus: MarkdownBlockLike = {
      id: "ns1",
      node: paragraph(text("No status")),
    };
    const parser: ParserLike = {
      append: () => undefined,
      finalize: () => undefined,
      blocks: [blockNoStatus],
    };
    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, "x", { parser, render });

    const output = simplify(render.mock.calls[0]?.[0]) as any[];
    expect(output[0].attrs["data-block-status"]).toBe("pending");
  });

  // ---- direct tableRow / tableCell rendering ----

  it("renders a standalone tableRow as <tr> wrapping renderTableRow output", async () => {
    const row = tableRow(tableCell(text("A")), tableCell(text("B")));
    const result = await renderSingleBlock(row);
    expect(result.type).toBe("tr");
    // The switch case wraps renderTableRow (which itself returns a <tr>) in another <tr>
    const innerTr = result.children[0];
    expect(innerTr.type).toBe("tr");
    expect(innerTr.children).toHaveLength(2);
    expect(innerTr.children[0].type).toBe("td");
    expect(innerTr.children[1].type).toBe("td");
  });

  it("renders a standalone tableCell as <td>", async () => {
    const cell = tableCell(text("Cell"));
    const result = await renderSingleBlock(cell);
    expect(result.type).toBe("td");
    expect(result.children).toEqual(["Cell"]);
  });

  // ---- nested inline formatting ----

  it("renders nested inline: strong > emphasis > text", async () => {
    const result = await renderSingleBlock(
      paragraph(strong(emphasis(text("bold-italic")))),
    );
    const strongEl = result.children[0];
    expect(strongEl.type).toBe("strong");
    expect(strongEl.children[0].type).toBe("em");
    expect(strongEl.children[0].children).toEqual(["bold-italic"]);
  });

  // ---- empty children edge cases ----

  it("renders paragraph with no children", async () => {
    const result = await renderSingleBlock(paragraph());
    expect(result.type).toBe("p");
    expect(result.children).toEqual([]);
  });

  it("renders code block with empty value", async () => {
    const result = await renderSingleBlock(code(""));
    expect(result.type).toBe("pre");
    expect(result.children[0].children).toEqual([""]);
  });

  // ---- link with no title and no children ----

  it("renders link with empty children", async () => {
    const result = await renderSingleBlock(
      paragraph(link("https://example.com", null)),
    );
    const a = result.children[0];
    expect(a.type).toBe("a");
    expect(a.attrs.href).toBe("https://example.com");
    expect(a.children).toEqual([]);
  });

  // ---- image with empty alt ----

  it("renders image with empty alt", async () => {
    const result = await renderSingleBlock(
      paragraph(image("photo.jpg", "")),
    );
    const img = result.children[0];
    expect(img.attrs.alt).toBe("");
  });

  // ---- unchecked checkbox (false vs null) ----

  it("renders listItem without checked property as regular li", async () => {
    const node: MarkdownAstNode = {
      type: "listItem",
      checked: null,
      children: [paragraph(text("Regular"))],
    };
    const result = await renderSingleBlock(list(node));
    const li = result.children[0];
    // checked is null (not boolean), so no checkbox rendered
    expect(li.children[0].type).toBe("p");
  });

  // ---- empty update object in incremental collections ----

  it("handles empty objects from append without crashing", async () => {
    const parser = new FakeParser(
      [{ blocks: [block("b1", paragraph(text("ok")), "completed")] }],
    );
    const render = vi.fn();
    const target = new FakeElement() as unknown as Element;

    await updateWithMarkdown(target, streamOf("a"), { parser, render });
    expect(render).toHaveBeenCalled();
  });
});
