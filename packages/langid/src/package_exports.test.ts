/**
 * Minimal benchmark test for Node.js environment
 * Tests basic package structure without WASM initialization
 */
import { describe, it } from "vitest";

describe("Package Structure", () => {
  it("should have correct exports structure", async () => {
    console.log("📦 Testing package structure...");

    // Test that the main entry points exist
    const fs = await import("node:fs");
    const path = await import("node:path");

    // Check that essential files exist
    const requiredFiles = [
      "dist/index.js",
      "dist/index.d.ts",
      "pkg/defuss_langid.js",
      "pkg/defuss_langid.d.ts",
      "pkg/defuss_langid_bg.wasm",
    ];

    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      console.log(`${exists ? "✅" : "❌"} ${file}`);
      if (!exists) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    console.log("🎉 All required files present");
  });

  it("should have valid package.json exports", async () => {
    console.log("📄 Testing package.json exports...");

    const fs = await import("node:fs");
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

    // Check exports structure
    const exports = packageJson.exports;
    console.log("Package exports:", Object.keys(exports));

    if (!exports["."]) throw new Error("Missing main export");
    if (!exports["./wasm"]) throw new Error("Missing WASM export");
    if (!exports["./js"]) throw new Error("Missing JS export");

    console.log("✅ Package exports are correctly configured");
  });
});
