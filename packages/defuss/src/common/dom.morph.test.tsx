import { describe, expect, it } from "vitest";
import type { Globals } from "../render/types.js";
import { renderSync } from "../render/client.js";
import { updateDomWithVdom } from "./dom.js";

const App = ({ items }: { items: Array<string> }) => {
    return (
        <ul>
            {items.map((id) => (
                <li key={id}>
                    <input id={`i-${id}`} />
                    <span>{id}</span>
                </li>
            ))}
        </ul>
    );
};

describe("updateDomWithVdom (state-preserving morph)", () => {
    it("preserves element identity and value on keyed reorders", () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        renderSync(<App items={["a", "b", "c"]} />, container);

        const inputB = document.querySelector("#i-b") as HTMLInputElement;
        inputB.value = "hello";

        updateDomWithVdom(container, <App items={["c", "b", "a", "d"]} />, globalThis as unknown as Globals);

        const inputBAfter = document.querySelector("#i-b") as HTMLInputElement;

        // Key test: element identity is preserved (same DOM node)
        expect(inputBAfter).toBe(inputB);
        // Key test: input value is preserved (state not lost)
        expect(inputB.value).toBe("hello");
    });

    it("does not duplicate event handlers across repeated updates (delegated events)", () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        let calls = 0;

        const Button = ({ label }: { label: string }) => {
            return <button id="btn" onClick={() => (calls += 1)}>{label}</button>;
        };

        renderSync(<Button label="a" />, container);

        // re-render several times; old implementation would stack addEventListener
        updateDomWithVdom(container, <Button label="b" />, globalThis as any);
        updateDomWithVdom(container, <Button label="c" />, globalThis as any);
        updateDomWithVdom(container, <Button label="d" />, globalThis as any);

        const btn = document.querySelector("#btn") as HTMLButtonElement;
        btn.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));

        expect(calls).toBe(1);
    });

    it("preserves element identity when class changes (no node churn)", () => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        // Component that can toggle a class (like "danger" on selection)
        const Row = ({ selected }: { selected: boolean }) => (
            <tr className={selected ? "danger" : ""}>
                <td>
                    <input id="row-input" />
                </td>
            </tr>
        );

        renderSync(<Row selected={false} />, container);

        const inputBefore = document.querySelector("#row-input") as HTMLInputElement;
        inputBefore.value = "user typed this";
        inputBefore.focus();

        // Morph with class change (adding "danger")
        updateDomWithVdom(container, <Row selected={true} />, globalThis as any);

        const inputAfter = document.querySelector("#row-input") as HTMLInputElement;
        const tr = container.querySelector("tr") as HTMLElement;

        // Key assertions: identity + state preserved
        expect(inputAfter).toBe(inputBefore); // same DOM node
        expect(inputBefore.value).toBe("user typed this"); // value preserved
        expect(document.activeElement).toBe(inputAfter); // focus preserved
        expect(tr.className).toBe("danger"); // class was updated
    });
});
