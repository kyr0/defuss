/**
 * Kitchen Sink Test Suite - Core Rendering Tests
 * 
 * Tests fundamental rendering behaviors including:
 * - Recursive component rendering
 * - Fragment handling and nesting
 * - Boolean child semantics
 * - Conditional rendering patterns
 * - Mixed children types
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { $, createRef, RenderInput, type Ref } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, getTextContent, countElements, nextTick } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Core Rendering", () => {
    describe("Boolean Children Semantics", () => {
        it("should NOT render {false} as text", async () => {
            const Component = (): RenderInput => (
                <div>
                    {false}
                    <span>visible</span>
                </div>
            );

            await $(container).jsx(<Component />);

            expect(container.textContent).not.toContain("false");
            expect(container.textContent).toContain("visible");
        });

        it("should NOT render {true} as text", async () => {
            const Component = () => (
                <div>
                    {true}
                    <span>visible</span>
                </div>
            );

            await $(container).jsx(<Component />);

            expect(container.textContent).not.toContain("true");
            expect(container.textContent).toContain("visible");
        });

        it("should render {0} as text (not falsy filtering)", async () => {
            const Component = () => (
                <div>
                    Count: {0}
                </div>
            );

            await $(container).jsx(<Component />);

            expect(container.textContent).toContain("0");
        });

        it("should render empty string but not break", async () => {
            const Component = () => (
                <div>
                    {""}
                    <span>visible</span>
                </div>
            );

            await $(container).jsx(<Component />);

            expect(container.textContent).toContain("visible");
        });

        it("should handle boolean attributes correctly (not filter them)", async () => {
            const Component = () => (
                <input type="checkbox" disabled={true} checked={false} />
            );

            await $(container).jsx(<Component />);

            const input = container.querySelector("input") as HTMLInputElement;
            expect(input).toBeTruthy();
            expect(input.disabled).toBe(true);
            expect(input.checked).toBe(false);
        });

        it("should handle conditional rendering with &&", async () => {
            const showA = true;
            const showB = false;

            const Component = () => (
                <div>
                    {showA && <span class="a">A</span>}
                    {showB && <span class="b">B</span>}
                </div>
            );

            await $(container).jsx(<Component />);

            expect(countElements(container, ".a")).toBe(1);
            expect(countElements(container, ".b")).toBe(0);
            // The {false} from showB && should NOT render "false"
            expect(container.textContent).not.toContain("false");
        });

        it("should handle ternary rendering", async () => {
            const condition = false;

            const Component = () => (
                <div>
                    {condition ? <span>yes</span> : <span>no</span>}
                </div>
            );

            await $(container).jsx(<Component />);

            expect(container.textContent).toContain("no");
            expect(container.textContent).not.toContain("yes");
        });
    });

    describe("Recursive Components", () => {
        it("should render recursive tree structure", async () => {
            interface TreeNode {
                id: string;
                children?: TreeNode[];
            }

            const treeData: TreeNode = {
                id: "root",
                children: [
                    { id: "a", children: [{ id: "a1" }, { id: "a2" }] },
                    { id: "b", children: [{ id: "b1" }] },
                ],
            };

            const TreeItem = ({ node }: { node: TreeNode }) => (
                <li data-id={node.id}>
                    {node.id}
                    {node.children && node.children.length > 0 && (
                        <ul>
                            {node.children.map((child) => (
                                <TreeItem node={child} key={child.id} />
                            ))}
                        </ul>
                    )}
                </li>
            );

            const Tree = () => (
                <ul class="tree">
                    <TreeItem node={treeData} />
                </ul>
            );

            await $(container).jsx(<Tree />);

            expect(countElements(container, "li")).toBe(6); // root, a, a1, a2, b, b1
            expect(container.querySelector('[data-id="a1"]')).toBeTruthy();
            expect(container.querySelector('[data-id="b1"]')).toBeTruthy();
        });

        it("should handle deeply nested recursion (10 levels)", async () => {
            const DeepNested = ({ depth }: { depth: number }) => {
                if (depth <= 0) {
                    return <span class="leaf">leaf</span>;
                }
                return (
                    <div class={`level-${depth}`}>
                        <DeepNested depth={depth - 1} />
                    </div>
                );
            };

            await $(container).jsx(<DeepNested depth={10} />);

            expect(countElements(container, ".leaf")).toBe(1);
            expect(container.querySelector(".level-10")).toBeTruthy();
            expect(container.querySelector(".level-1")).toBeTruthy();
        });
    });

    describe("Fragment Handling", () => {
        it("should render fragments without wrapper elements", async () => {
            const Component = () => (
                <>
                    <span>a</span>
                    <span>b</span>
                    <span>c</span>
                </>
            );

            await $(container).jsx(<Component />);

            // Fragments should NOT create wrapper elements
            const spans = container.querySelectorAll("span");
            expect(spans.length).toBe(3);
            // Direct children of container
            expect(container.children[0]?.tagName).toBe("SPAN");
        });

        it("should handle nested fragments", async () => {
            const Component = () => (
                <>
                    <span>1</span>
                    <>
                        <span>2</span>
                        <span>3</span>
                    </>
                    <span>4</span>
                </>
            );

            await $(container).jsx(<Component />);

            const spans = container.querySelectorAll("span");
            expect(spans.length).toBe(4);
            expect(getTextContent(spans[0])).toBe("1");
            expect(getTextContent(spans[1])).toBe("2");
            expect(getTextContent(spans[2])).toBe("3");
            expect(getTextContent(spans[3])).toBe("4");
        });

        it("should handle fragments with mixed content", async () => {
            const Component = () => (
                <>
                    text before
                    <span>element</span>
                    text after
                </>
            );

            await $(container).jsx(<Component />);

            expect(container.textContent).toContain("text before");
            expect(container.textContent).toContain("element");
            expect(container.textContent).toContain("text after");
        });

        it("should handle empty fragments", async () => {
            const Component = () => (
                <div>
                    before
                    <></>
                    after
                </div>
            );

            await $(container).jsx(<Component />);

            expect(container.textContent).toContain("before");
            expect(container.textContent).toContain("after");
        });
    });

    describe("Mixed Children Types", () => {
        it("should render array of mixed types", async () => {
            const items = ["text", 123, <span key="el">element</span>, null, undefined, false];

            const Component = () => <div>{items}</div>;

            await $(container).jsx(<Component />);

            expect(container.textContent).toContain("text");
            expect(container.textContent).toContain("123");
            expect(container.textContent).toContain("element");
            expect(container.textContent).not.toContain("null");
            expect(container.textContent).not.toContain("undefined");
            expect(container.textContent).not.toContain("false");
        });

        it("should handle array.map with key prop", async () => {
            const items = [
                { id: "1", name: "Item 1" },
                { id: "2", name: "Item 2" },
                { id: "3", name: "Item 3" },
            ];

            const Component = () => (
                <ul>
                    {items.map((item) => (
                        <li key={item.id} data-id={item.id}>
                            {item.name}
                        </li>
                    ))}
                </ul>
            );

            await $(container).jsx(<Component />);

            expect(countElements(container, "li")).toBe(3);
            expect(container.querySelector('[data-id="1"]')?.textContent).toBe("Item 1");
        });

        it("should handle nested arrays (flatten)", async () => {
            const Component = () => (
                <div>
                    {[
                        [<span key="a">a</span>, <span key="b">b</span>],
                        [<span key="c">c</span>],
                    ]}
                </div>
            );

            await $(container).jsx(<Component />);

            const spans = container.querySelectorAll("span");
            expect(spans.length).toBe(3);
        });
    });

    describe("Component Props Patterns", () => {
        it("should pass children as prop correctly", async () => {
            const Wrapper = ({ children }: { children: any }) => (
                <div class="wrapper">{children}</div>
            );

            const Component = () => (
                <Wrapper>
                    <span>inside</span>
                </Wrapper>
            );

            await $(container).jsx(<Component />);

            expect(container.querySelector(".wrapper span")?.textContent).toBe("inside");
        });

        it("should spread props correctly", async () => {
            const Button = (props: any) => <button {...props} />;

            const Component = () => (
                <Button type="submit" class="btn" disabled={true}>
                    Click
                </Button>
            );

            await $(container).jsx(<Component />);

            const btn = container.querySelector("button") as HTMLButtonElement;
            expect(btn.type).toBe("submit");
            expect(btn.className).toBe("btn");
            expect(btn.disabled).toBe(true);
        });

        it("should handle default props pattern", async () => {
            const Card = ({ title = "Default Title", children }: { title?: string; children?: any }) => (
                <div class="card">
                    <h2>{title}</h2>
                    {children}
                </div>
            );

            await $(container).jsx(
                <div>
                    <Card>Content 1</Card>
                    <Card title="Custom">Content 2</Card>
                </div>
            );

            const titles = container.querySelectorAll("h2");
            expect(getTextContent(titles[0])).toBe("Default Title");
            expect(getTextContent(titles[1])).toBe("Custom");
        });
    });
});
