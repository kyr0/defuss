// @vitest-environment happy-dom
import { getBrowserGlobals } from "../../render/server.js";
import type { Globals } from "../../render/index.js";
import { $ } from "../dequery.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// TODO: migrate https://github.com/jquery/jquery/blob/main/test/unit/core.js

describe("jQuery API compatibility (core)", async () => {
  let globals: Globals;

  const fixtureHTML = readFileSync(
    resolve(__dirname, "./fixture.html"),
    "utf-8",
  );
  beforeEach(() => {
    globals = getBrowserGlobals();
    globals.document.body.innerHTML = fixtureHTML;
  });

  it("jQuery()", async () => {
    const obj = await $("div", { globals });
    expect(obj.length).toBe(58);
  });

  it(".append($(...)) clones for multi-target", async () => {
    globals.document.body.innerHTML = '<div class="target"></div><div class="target"></div>';
    const targets = await $(".target", { globals });
    const child = await $("<span>cloned</span>", { globals });

    await targets.append(child);

    const spans = globals.document.querySelectorAll("span");
    expect(spans.length).toBe(2);
    // Both targets should have their own span (cloned), not the same node
    expect(spans[0]).not.toBe(spans[1]);
    expect(spans[0].textContent).toBe("cloned");
    expect(spans[1].textContent).toBe("cloned");
  });
});
