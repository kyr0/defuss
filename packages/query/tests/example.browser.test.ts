import { describe, expect, it, vi } from "vitest";
import { MORPH_ALL_MIN, loadScript } from "./browser-utils";

/**
 * Interactive example E2E: the real examples/index.html markup plus the real
 * examples/app.js, driven with native DOM APIs (7 checks).
 */

const qs = (selector: string): any => {
  const el = document.querySelector(selector);
  if (!el) throw Error(`missing element: ${selector}`);
  return el;
};

describe("interactive example (examples/index.html + app.js)", () => {
  it("add, literal text, keyed identity, remove, checkbox, FormData, transition", async () => {
    // install the example markup (scripts intentionally excluded: DOM-inserted
    // scripts would execute, and loading is orchestrated here instead)
    const html = await (await fetch("/examples/index.html")).text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    document.body.replaceChildren(
      ...[...parsed.body.childNodes].filter(
        (node) => (node as any).localName !== "script",
      ),
    );

    await loadScript(MORPH_ALL_MIN);
    await loadScript("/dist/all.min.js");
    const appUrl: string = "/examples/app.js";
    const { start } = (await import(/* @vite-ignore */ appUrl)) as any;
    start((window as any).df$);

    // 1. add a task through the native form
    qs("#title").value = "<b>literal</b>";
    qs("#add-form button").click();
    expect(document.querySelectorAll("#tasks li").length).toBe(3);

    // 2. user input is rendered as literal text, not markup
    expect(qs('[data-id="3"] span').textContent).toBe("<b>literal</b>");

    // 3. keyed reorder retains row identity
    const row = qs('[data-id="1"]');
    qs("#reverse").click();
    expect(document.querySelector('[data-id="1"]')).toBe(row);

    // 4. remove a task
    qs('[data-id="3"] button').click();
    expect(document.querySelectorAll("#tasks li").length).toBe(2);

    // 5. checkbox update marks the task done
    qs('[data-id="1"] input').click();
    expect(qs('[data-id="1"]').classList.contains("done")).toBe(true);

    // 6. native duplicate FormData + submitter handling
    qs("#data-form button").click();
    const data = JSON.parse(qs("#form-result").textContent);
    expect(data.topics.join(",")).toBe("dom,types");
    expect(data.query).toContain("action=inspect");

    // 7. awaited transition completes and keeps the keyed rows
    qs("#transition").click();
    await vi.waitFor(() => {
      expect(qs("#status").textContent.startsWith("Transition completed")).toBe(
        true,
      );
    });
  });
});
