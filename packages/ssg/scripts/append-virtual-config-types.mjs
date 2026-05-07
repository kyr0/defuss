import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const declaration = `
declare module "virtual:defuss-ssg/config" {
	export const viteConfig: import("vite").InlineConfig;
	export default viteConfig;
}
`;

const outputFiles = [
	resolve("dist/index.d.mts"),
	resolve("dist/index.d.cts"),
];

for (const outputFile of outputFiles) {
	const source = await readFile(outputFile, "utf8");
	if (source.includes('declare module "virtual:defuss-ssg/config"')) {
		continue;
	}

	await writeFile(outputFile, `${source}\n${declaration}`, "utf8");
}