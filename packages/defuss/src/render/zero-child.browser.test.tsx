/**
 * Browser test for numeric zero child rendering (#50).
 * Verifies that {0} is preserved in JSX output in a real browser environment.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderSync } from "../render/client.js";

describe("numeric zero child rendering - browser (#50)", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it("renders {0} as visible text in the DOM", () => {
        const el = renderSync(<p>{0}</p>) as Element;
        container.appendChild(el);

        expect(el.textContent).toBe("0");
        expect(container.querySelector("p")?.textContent).toBe("0");
    });

    it("renders '0 von 5 ausgewählt' correctly", () => {
        const el = renderSync(<span>{0} von {5} ausgewählt</span>) as Element;
        container.appendChild(el);

        expect(el.textContent).toBe("0 von 5 ausgewählt");
    });

    it("renders 0 from a variable in a component", () => {
        const Counter = () => {
            const count = 0;
            return <span>{count} von 5 ausgewählt</span>;
        };

        const el = renderSync(<Counter />) as Element;
        container.appendChild(el);

        expect(el.textContent).toBe("0 von 5 ausgewählt");
    });

    it("renders the full reproduction case from issue #50", () => {
        const App = () => (
            <div>
                <p>{0}</p>
                <p>{0} von {5} ausgewählt</p>
                <p>{1} von {5} ausgewählt</p>
            </div>
        );

        const el = renderSync(<App />) as Element;
        container.appendChild(el);

        const paragraphs = el.querySelectorAll("p");
        expect(paragraphs).toHaveLength(3);
        expect(paragraphs[0].textContent).toBe("0");
        expect(paragraphs[1].textContent).toBe("0 von 5 ausgewählt");
        expect(paragraphs[2].textContent).toBe("1 von 5 ausgewählt");
    });

    it("still filters out null and undefined but keeps 0", () => {
        const el = renderSync(
            <div>{null}{0}{undefined}</div>,
        ) as Element;
        container.appendChild(el);

        expect(el.textContent).toBe("0");
    });
});
