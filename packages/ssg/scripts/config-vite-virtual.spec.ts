import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import { mergeUserViteConfig, readConfig } from "../src/config.js";

describe("virtual:defuss-ssg/config", () => {
	test("exposes the current base vite config to project config.ts without double-merging it", async () => {
		const projectDir = await mkdtemp(
			join(tmpdir(), "defuss-ssg-virtual-config-"),
		);

		try {
			await writeFile(
				join(projectDir, "config.ts"),
				[
					'import { mergeConfig } from "vite";',
					'import { viteConfig } from "virtual:defuss-ssg/config";',
					"",
					"const pluginNames = (viteConfig.plugins ?? []).map((plugin) => plugin?.name ?? \"unknown\");",
					"const existingAlias = (viteConfig.resolve?.alias as Record<string, string> | undefined)?.existing ?? \"missing\";",
					"",
					"export default {",
					"\tviteConfig: mergeConfig(viteConfig, {",
					"\t\tresolve: {",
					"\t\t\talias: {",
					"\t\t\t\texistingFromBase: existingAlias,",
					`\t\t\t\tadded: ${JSON.stringify(resolve(projectDir, "src"))},`,
					"\t\t\t},",
					"\t\t},",
					"\t\tplugins: [",
					"\t\t\t{ name: `after-${pluginNames.join(\"-\")}` },",
					"\t\t],",
					"\t}),",
					"};",
				].join("\n"),
				"utf8",
			);

			const currentViteConfig = {
				resolve: {
					alias: {
						existing: "/base-alias",
					},
				},
				plugins: [{ name: "base-plugin" }],
			};

			const config = await readConfig(projectDir, false, {
				currentViteConfig,
			});
			const finalViteConfig = mergeUserViteConfig(
				currentViteConfig,
				config.viteConfig,
			);

			expect(
				(finalViteConfig.plugins ?? []).map((plugin) => plugin?.name),
			).toEqual(["base-plugin", "after-base-plugin"]);
			expect(finalViteConfig.resolve?.alias).toEqual({
				existing: "/base-alias",
				existingFromBase: "/base-alias",
				added: resolve(projectDir, "src"),
			});
		} finally {
			await rm(projectDir, { recursive: true, force: true });
		}
	});

	test("supports example-ssg merging with the current vite config", async () => {
		const exampleProjectDir = resolve(process.cwd(), "../../example-ssg");
		const config = await readConfig(exampleProjectDir, false, {
			currentViteConfig: {
				resolve: {
					alias: {
						existing: "/base-alias",
					},
				},
				plugins: [{ name: "base-plugin" }],
			},
		});
		const finalViteConfig = mergeUserViteConfig(
			{
				resolve: {
					alias: {
						existing: "/base-alias",
					},
				},
				plugins: [{ name: "base-plugin" }],
			},
			config.viteConfig,
		);

		expect(finalViteConfig.resolve?.alias).toMatchObject({
			existing: "/base-alias",
		});
		expect(finalViteConfig.server?.allowedHosts).toContain(
			"example-ssg.demo.defuss.tech",
		);
		expect(
			(finalViteConfig.plugins ?? []).map((plugin) => plugin?.name),
		).toContain("base-plugin");
	});
});