import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.bench.ts"],
        environment: "node", // Benchmarks usually run faster/cleaner in Node if DOM isn't strictly required, but Store supports both. We'll verify both if possible, but Node is fine for pure JS store logic.
    },
});
