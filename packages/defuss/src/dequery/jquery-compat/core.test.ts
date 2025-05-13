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
});
