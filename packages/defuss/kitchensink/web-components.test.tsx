/**
 * Kitchen Sink Test Suite - Web Components Tests
 * 
 * Tests dynamic rendering and changes with web components (open shadow DOM):
 * - Custom elements with shadow DOM
 * - Dynamic content updates inside shadow DOM
 * - Event handling across shadow boundary
 * - Store-driven updates within web components
 * - Component lifecycle and cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, createStore, type Ref, type Store } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait, countElements, getTextContent } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

// Unique element name generator to avoid conflicts between tests
let elementCounter = 0;
const uniqueElementName = (base: string) => `${base}-${Date.now()}-${++elementCounter}`;

// Helper to create custom element JSX with proper children passing
const customElement = (tagName: string, props: Record<string, any> = {}, children?: any) => {
    return jsx(tagName, { ...props, children });
};

describe("Web Components (Shadow DOM)", () => {
    describe("Basic Shadow DOM Rendering", () => {
        it("should render content into custom element with open shadow DOM", async () => {
            const elementName = uniqueElementName("basic-shadow");

            class BasicShadow extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `
                            <style>:host { display: block; }</style>
                            <div class="shadow-content">
                                <slot></slot>
                            </div>
                        `;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, BasicShadow);
            }

            await $(container).jsx(
                <div class="wrapper">
                    {customElement(elementName, {}, <span class="slotted">Slotted Content</span>)}
                </div>
            );

            const customEl = container.querySelector(elementName) as HTMLElement;
            expect(customEl).toBeTruthy();
            expect(customEl.shadowRoot).toBeTruthy();
            expect(customEl.shadowRoot?.querySelector(".shadow-content")).toBeTruthy();
            expect(customEl.querySelector(".slotted")?.textContent).toBe("Slotted Content");
        });

        it("should handle multiple slots in shadow DOM", async () => {
            const elementName = uniqueElementName("multi-slot");

            class MultiSlot extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `
                            <div class="container">
                                <header><slot name="header"></slot></header>
                                <main><slot></slot></main>
                                <footer><slot name="footer"></slot></footer>
                            </div>
                        `;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, MultiSlot);
            }

            await $(container).jsx(
                customElement(elementName, {}, [
                    <h1 slot="header" key="h">Header Content</h1>,
                    <p key="p">Main Content</p>,
                    <span slot="footer" key="f">Footer Content</span>
                ])
            );

            const customEl = container.querySelector(elementName) as HTMLElement;
            expect(customEl.querySelector('[slot="header"]')?.textContent).toBe("Header Content");
            expect(customEl.querySelector('p')?.textContent).toBe("Main Content");
            expect(customEl.querySelector('[slot="footer"]')?.textContent).toBe("Footer Content");
        });
    });

    describe("Dynamic Content Updates in Shadow DOM", () => {
        it("should update slotted content dynamically using component pattern", async () => {
            const elementName = uniqueElementName("dynamic-slot");
            const containerRef = createRef<HTMLDivElement>();

            class DynamicSlot extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<div class="inner"><slot></slot></div>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, DynamicSlot);
            }

            // Use defuss component pattern (function component that wraps custom element)
            const DynamicContent = ({ message }: { message: string }) => (
                customElement(elementName, {},
                    <span class="content">{message}</span>
                )
            );

            await $(container).jsx(<div ref={containerRef}><DynamicContent message="Initial" /></div>);

            expect(container.querySelector(".content")?.textContent).toBe("Initial");

            // Re-render with new props - this follows the defuss pattern
            await $(containerRef).jsx(<DynamicContent message="Updated" />);

            expect(container.querySelector(".content")?.textContent).toBe("Updated");
        });

        it("should handle list updates inside slotted content", async () => {
            const elementName = uniqueElementName("list-slot");
            const containerRef = createRef<HTMLDivElement>();

            class ListSlot extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<ul class="shadow-list"><slot></slot></ul>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, ListSlot);
            }

            const ListContent = ({ items }: { items: string[] }) => (
                customElement(elementName, {},
                    items.map(item => (
                        <li key={item} class="list-item">{item}</li>
                    ))
                )
            );

            await $(container).jsx(<div ref={containerRef}><ListContent items={["A", "B", "C"]} /></div>);

            expect(countElements(container, ".list-item")).toBe(3);

            // Add item via re-render
            await $(containerRef).jsx(<ListContent items={["A", "B", "C", "D"]} />);
            expect(countElements(container, ".list-item")).toBe(4);

            // Remove item
            await $(containerRef).jsx(<ListContent items={["A", "C", "D"]} />);
            expect(countElements(container, ".list-item")).toBe(3);
        });

        it("should morph custom element content without recreating the host", async () => {
            const elementName = uniqueElementName("morph-host");
            const containerRef = createRef<HTMLDivElement>();
            let connectedCount = 0;

            class MorphHost extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    connectedCount++;
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<slot></slot>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, MorphHost);
            }

            const MorphComponent = ({ content }: { content: string }) => (
                customElement(elementName, { class: "my-host" },
                    <span class="content">{content}</span>
                )
            );

            await $(container).jsx(<div ref={containerRef}><MorphComponent content="Content 1" /></div>);

            expect(connectedCount).toBe(1);
            expect(container.querySelector(".content")?.textContent).toBe("Content 1");

            // Update content - should morph, not recreate
            await $(containerRef).jsx(<MorphComponent content="Content 2" />);

            // Host should not be recreated (connectedCallback not called again)
            expect(connectedCount).toBe(1);
            expect(container.querySelector(".content")?.textContent).toBe("Content 2");
        });
    });

    describe("Event Handling Across Shadow Boundary", () => {
        it("should handle click events on slotted content", async () => {
            const elementName = uniqueElementName("click-slot");
            const clickLog: string[] = [];

            class ClickSlot extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<div class="wrapper"><slot></slot></div>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, ClickSlot);
            }

            await $(container).jsx(
                customElement(elementName, {},
                    <button class="slotted-btn" onClick={() => clickLog.push("clicked")}>
                        Click Me
                    </button>
                )
            );

            const button = container.querySelector(".slotted-btn") as HTMLButtonElement;
            expect(button).toBeTruthy();
            button.click();

            expect(clickLog).toEqual(["clicked"]);
        });

        it("should handle events with dynamic handler replacement", async () => {
            const elementName = uniqueElementName("dynamic-handler");
            const containerRef = createRef<HTMLDivElement>();
            const clickLog: number[] = [];

            class DynamicHandler extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<slot></slot>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, DynamicHandler);
            }

            const ButtonComponent = ({ version, onClick }: { version: number; onClick: () => void }) => (
                customElement(elementName, {},
                    <button class="versioned-btn" onClick={onClick}>
                        Version {String(version)}
                    </button>
                )
            );

            await $(container).jsx(<div ref={containerRef}>
                <ButtonComponent version={1} onClick={() => clickLog.push(1)} />
            </div>);

            (container.querySelector(".versioned-btn") as HTMLButtonElement).click();
            expect(clickLog).toEqual([1]);

            // Replace with new handler
            await $(containerRef).jsx(
                <ButtonComponent version={2} onClick={() => clickLog.push(2)} />
            );

            (container.querySelector(".versioned-btn") as HTMLButtonElement).click();
            expect(clickLog).toEqual([1, 2]);

            // Replace again
            await $(containerRef).jsx(
                <ButtonComponent version={3} onClick={() => clickLog.push(3)} />
            );

            (container.querySelector(".versioned-btn") as HTMLButtonElement).click();
            expect(clickLog).toEqual([1, 2, 3]);
        });
    });

    describe("Store-Driven Updates in Web Components", () => {
        it("should handle store subscriptions with shadow DOM components", async () => {
            const elementName = uniqueElementName("store-shadow");
            const containerRef = createRef<HTMLDivElement>();
            const store = createStore({ value: 0, label: "Counter" });

            class StoreShadow extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `
                            <style>.container { padding: 10px; }</style>
                            <div class="container"><slot></slot></div>
                        `;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, StoreShadow);
            }

            const Counter = () => (
                customElement(elementName, { class: "counter-component" }, [
                    <span key="l" class="label">{store.value.label}</span>,
                    <span key="v" class="value">{String(store.value.value)}</span>,
                    <button key="b" class="inc" onClick={() => {
                        store.set({ ...store.value, value: store.value.value + 1 });
                    }}>+</button>
                ])
            );

            const render = async () => {
                await $(containerRef).jsx(<Counter />);
            };

            await $(container).jsx(<div ref={containerRef}><Counter /></div>);

            store.subscribe(render);

            expect(container.querySelector(".value")?.textContent).toBe("0");

            // Click increment
            (container.querySelector(".inc") as HTMLButtonElement).click();
            await wait(20);

            expect(container.querySelector(".value")?.textContent).toBe("1");

            // Multiple increments
            (container.querySelector(".inc") as HTMLButtonElement).click();
            await wait(20);
            (container.querySelector(".inc") as HTMLButtonElement).click();
            await wait(20);

            expect(container.querySelector(".value")?.textContent).toBe("3");
        });

        it("should handle conditional rendering inside shadow DOM slot", async () => {
            const elementName = uniqueElementName("conditional-shadow");
            const containerRef = createRef<HTMLDivElement>();
            const store = createStore({ showDetails: false, data: { name: "Test" } });

            class ConditionalShadow extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<div class="card"><slot></slot></div>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, ConditionalShadow);
            }

            const Card = () => (
                customElement(elementName, { class: "my-card" }, [
                    <h2 key="t" class="title">{store.value.data.name}</h2>,
                    <button key="b" class="toggle" onClick={() => {
                        store.set({ ...store.value, showDetails: !store.value.showDetails });
                    }}>
                        {store.value.showDetails ? "Hide" : "Show"} Details
                    </button>,
                    store.value.showDetails && (
                        <div key="d" class="details">
                            <p>Detailed information here</p>
                        </div>
                    )
                ].filter(Boolean))
            );

            const render = async () => {
                await $(containerRef).jsx(<Card />);
            };

            await $(container).jsx(<div ref={containerRef}><Card /></div>);

            store.subscribe(render);

            expect(container.querySelector(".details")).toBeNull();
            expect(container.querySelector(".toggle")?.textContent).toBe("Show Details");

            // Toggle details on
            (container.querySelector(".toggle") as HTMLButtonElement).click();
            await wait(20);

            expect(container.querySelector(".details")).toBeTruthy();
            expect(container.querySelector(".toggle")?.textContent).toBe("Hide Details");

            // Toggle details off
            (container.querySelector(".toggle") as HTMLButtonElement).click();
            await wait(20);

            expect(container.querySelector(".details")).toBeNull();
        });
    });

    describe("Custom Element Lifecycle", () => {
        it("should handle attributeChangedCallback with dynamic props", async () => {
            const elementName = uniqueElementName("observed-attrs");
            const containerRef = createRef<HTMLDivElement>();
            const attrChanges: Array<{ name: string; old: string | null; new: string | null }> = [];

            class ObservedAttrs extends HTMLElement {
                static observedAttributes = ["data-value", "data-label"];

                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }

                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<slot></slot>`;
                    }
                }

                attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
                    attrChanges.push({ name, old: oldVal, new: newVal });
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, ObservedAttrs);
            }

            // Initial render
            await $(container).jsx(
                <div ref={containerRef}>
                    {customElement(elementName, { "data-value": "1", "data-label": "initial" },
                        <span>Content</span>
                    )}
                </div>
            );

            // Update attributes
            await $(containerRef).jsx(
                customElement(elementName, { "data-value": "2", "data-label": "updated" },
                    <span>Content</span>
                )
            );

            // Check attribute changes were observed
            const valueChanges = attrChanges.filter(c => c.name === "data-value");
            const labelChanges = attrChanges.filter(c => c.name === "data-label");

            expect(valueChanges.length).toBeGreaterThan(0);
            expect(labelChanges.length).toBeGreaterThan(0);
            expect(valueChanges[valueChanges.length - 1].new).toBe("2");
            expect(labelChanges[labelChanges.length - 1].new).toBe("updated");
        });

        it("should properly cleanup when removing custom elements", async () => {
            const elementName = uniqueElementName("cleanup-element");
            const containerRef = createRef<HTMLDivElement>();
            const lifecycleLog: string[] = [];

            class CleanupElement extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }

                connectedCallback() {
                    lifecycleLog.push("connected");
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<slot></slot>`;
                    }
                }

                disconnectedCallback() {
                    lifecycleLog.push("disconnected");
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, CleanupElement);
            }

            // Add element
            await $(container).jsx(
                <div ref={containerRef}>
                    {customElement(elementName, {},
                        <span>Content</span>
                    )}
                </div>
            );

            expect(lifecycleLog).toContain("connected");

            // Remove element
            await $(containerRef).jsx(<span>Replacement</span>);

            expect(lifecycleLog).toContain("disconnected");
        });

        it("should handle rapid mount/unmount cycles", async () => {
            const elementName = uniqueElementName("rapid-mount");
            const containerRef = createRef<HTMLDivElement>();
            let mountCount = 0;
            let unmountCount = 0;

            class RapidMount extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }

                connectedCallback() {
                    mountCount++;
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<slot></slot>`;
                    }
                }

                disconnectedCallback() {
                    unmountCount++;
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, RapidMount);
            }

            await $(container).jsx(<div ref={containerRef}></div>);

            // Rapid toggle
            for (let i = 0; i < 5; i++) {
                await $(containerRef).jsx(
                    customElement(elementName, {},
                        <span>Cycle {String(i)}</span>
                    )
                );
                await $(containerRef).jsx(<span>Empty</span>);
            }

            // Final mount
            await $(containerRef).jsx(
                customElement(elementName, {},
                    <span>Final</span>
                )
            );

            // Should have mounted 6 times (5 in loop + 1 final)
            // and unmounted 5 times (5 in loop)
            expect(mountCount).toBe(6);
            expect(unmountCount).toBe(5);
        });
    });

    describe("Complex Shadow DOM Scenarios", () => {
        it("should handle form inputs inside shadow DOM", async () => {
            const elementName = uniqueElementName("form-shadow");
            const containerRef = createRef<HTMLDivElement>();
            const store = createStore({ name: "", email: "" });

            class FormShadow extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<form class="shadow-form"><slot></slot></form>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, FormShadow);
            }

            const Form = () => (
                customElement(elementName, {}, [
                    <label key="nl">
                        Name:
                        <input
                            type="text"
                            class="name-input"
                            value={store.value.name}
                            onInput={(e) => {
                                store.set({ ...store.value, name: (e.target as HTMLInputElement).value });
                            }}
                        />
                    </label>,
                    <label key="el">
                        Email:
                        <input
                            type="email"
                            class="email-input"
                            value={store.value.email}
                            onInput={(e) => {
                                store.set({ ...store.value, email: (e.target as HTMLInputElement).value });
                            }}
                        />
                    </label>,
                    <span key="p" class="preview">
                        {store.value.name} - {store.value.email}
                    </span>
                ])
            );

            const render = async () => {
                await $(containerRef).jsx(<Form />);
            };

            await $(container).jsx(<div ref={containerRef}><Form /></div>);

            store.subscribe(render);

            const nameInput = container.querySelector(".name-input") as HTMLInputElement;
            const emailInput = container.querySelector(".email-input") as HTMLInputElement;

            expect(nameInput).toBeTruthy();
            expect(emailInput).toBeTruthy();

            // Simulate input
            nameInput.value = "John";
            nameInput.dispatchEvent(new Event("input", { bubbles: true }));
            await wait(20);

            expect(store.value.name).toBe("John");
            expect(container.querySelector(".preview")?.textContent).toContain("John");

            emailInput.value = "john@example.com";
            emailInput.dispatchEvent(new Event("input", { bubbles: true }));
            await wait(20);

            expect(store.value.email).toBe("john@example.com");
        });

        it("should handle refs to elements inside slotted content", async () => {
            const elementName = uniqueElementName("ref-slot");
            const inputRef = createRef<HTMLInputElement>();

            class RefSlot extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<div class="input-wrapper"><slot></slot></div>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, RefSlot);
            }

            await $(container).jsx(
                customElement(elementName, {},
                    <input type="text" ref={inputRef} class="ref-input" />
                )
            );

            expect(inputRef.current).toBeTruthy();
            expect(inputRef.current!.tagName).toBe("INPUT");

            // Should be able to interact via ref
            inputRef.current!.focus();
            inputRef.current!.value = "test";

            expect((container.querySelector(".ref-input") as HTMLInputElement).value).toBe("test");
        });

        it("should handle nested custom elements", async () => {
            const outerName = uniqueElementName("outer-shadow");
            const innerName = uniqueElementName("inner-shadow");

            class InnerShadow extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<slot></slot>`;
                    }
                }
            }

            class OuterShadow extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<div class="outer"><slot></slot></div>`;
                    }
                }
            }

            if (!customElements.get(innerName)) {
                customElements.define(innerName, InnerShadow);
            }
            if (!customElements.get(outerName)) {
                customElements.define(outerName, OuterShadow);
            }

            await $(container).jsx(
                customElement(outerName, {}, [
                    <h1 key="h">Outer Title</h1>,
                    customElement(innerName, { key: "i" },
                        <span class="deep-content">Deeply Nested</span>
                    )
                ])
            );

            const outer = container.querySelector(outerName) as HTMLElement;
            const inner = container.querySelector(innerName) as HTMLElement;

            expect(outer).toBeTruthy();
            expect(inner).toBeTruthy();
            expect(outer.shadowRoot).toBeTruthy();
            expect(inner.shadowRoot).toBeTruthy();
            expect(container.querySelector(".deep-content")?.textContent).toBe("Deeply Nested");
        });

        it("should handle updates to deeply nested slotted content", async () => {
            const elementName = uniqueElementName("deep-update");
            const containerRef = createRef<HTMLDivElement>();

            class DeepSlot extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = `<div class="deep-wrapper"><slot></slot></div>`;
                    }
                }
            }

            if (!customElements.get(elementName)) {
                customElements.define(elementName, DeepSlot);
            }

            interface DeepProps { depth1: string; depth2: string; depth3: string }

            const DeepContent = ({ depth1, depth2, depth3 }: DeepProps) => (
                customElement(elementName, {},
                    <div class="level-1">
                        <span class="l1">{depth1}</span>
                        <div class="level-2">
                            <span class="l2">{depth2}</span>
                            <div class="level-3">
                                <span class="l3">{depth3}</span>
                            </div>
                        </div>
                    </div>
                )
            );

            await $(container).jsx(
                <div ref={containerRef}>
                    <DeepContent depth1="L1" depth2="L2" depth3="L3" />
                </div>
            );

            expect(container.querySelector(".l1")?.textContent).toBe("L1");
            expect(container.querySelector(".l2")?.textContent).toBe("L2");
            expect(container.querySelector(".l3")?.textContent).toBe("L3");

            // Update all levels
            await $(containerRef).jsx(
                <DeepContent depth1="Updated 1" depth2="Updated 2" depth3="Updated 3" />
            );

            expect(container.querySelector(".l1")?.textContent).toBe("Updated 1");
            expect(container.querySelector(".l2")?.textContent).toBe("Updated 2");
            expect(container.querySelector(".l3")?.textContent).toBe("Updated 3");
        });
    });
});
