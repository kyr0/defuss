import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	plugins: [],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "happy-dom",
		testTimeout: 30000,
		include: ["**/*.test.{ts,tsx}"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/*.md",
			"**/kitchensink/*",
			// Benchmark/performance tests for DOM operations (happy DOM SSR/SSG bench target evaluated here)
			"**/__benchmarks__/**",
			// jQuery compat tests use node:fs and happy-dom APIs not available in test env
			"**/jquery-compat/**",
		],
		clearMocks: true,
		globals: true,
		coverage: {
			provider: "v8",
			include: ["src/**/*"],
			exclude: ["**/*.{md,html}", "**/.DS_Store", "**/kitchensink/**", "**/__benchmarks__/**"],
		},
	},
});
