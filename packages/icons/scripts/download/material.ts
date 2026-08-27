import { join } from "node:path";
import { PluginConfig } from "svgo";
import { GithubCli } from "../github";
import {
	batchProcessing,
	fetchAsJSON,
	fetchAsText,
	fileExists,
	optimizeSvg,
	saveFile,
} from "../utils";

type MaterialDesignMeta = Array<MaterialDesignIcon>;

export interface MaterialDesignIcon {
	id: string;
	baseIconId: string;
	name: string;
	codepoint: string;
	aliases: string[];
	styles: string[];
	version: string;
	deprecated: boolean;
	tags: string[];
	author: string;
}

const OPTIMIZE_SVG_PLUGIN: PluginConfig[] = [
	{
		name: "removeAttrs",
		params: {
			attrs: ["id", "fill", "width", "height"],
		},
	},
	{
		name: "addAttributesToSVGElement",
		params: {
			attributes: [{ fill: "currentColor" }],
		},
	},
];

const downloadMaterialFiles = async (basePath: string, batchSize: number) => {
	const startTime = performance.now();

	console.log("🚀 Starting Material Design Icons download...");
	const githubCli = await GithubCli.create("Templarian", "MaterialDesign");

	console.log("📦 Fetching meta.json...");
	const materialDesignIcons = await fetchAsJSON<MaterialDesignMeta>(
		githubCli.getDownloadUrl("meta.json"),
	);
	const materialAssetsPath = join(basePath, "material");

	await saveFile(
		materialAssetsPath,
		"meta.json",
		JSON.stringify(materialDesignIcons, null, 2),
	);

	const nodesNodes: Record<string, { sha: string; size: number }> =
		await githubCli.getFolderNodes("svg").then((repsonse) =>
			repsonse
				.filter((node) => node.type === "blob" && node.path.endsWith(".svg"))
				.reduce(
					(prev, node) => {
						prev[node.fullPath] = {
							sha: node.sha,
							size: node.size as number,
						};

						return prev;
					},
					{} as Record<string, { sha: string; size: number }>,
				),
		);

	await saveFile(
		materialAssetsPath,
		"github-nodes.json",
		JSON.stringify(nodesNodes, null, 2),
	);

	console.log(`✅ Saved metadata for ${materialDesignIcons.length} icons.`);

	const materialSvgPath = join(materialAssetsPath, "svg");

	const hrefLicense = githubCli.getDownloadUrl("LICENSE");

	const processedCount = await batchProcessing(
		batchSize,
		materialDesignIcons,
		async (iconMetaData) => {
			const iconName = iconMetaData.name.toLowerCase() + ".svg";
			const subFolderName = iconMetaData.name.endsWith("-outline")
				? "outline"
				: "regular";
			const svgSavePath = join(materialSvgPath, subFolderName, iconName);

			if (!(await fileExists(svgSavePath))) {
				const iconSvgData = await fetchAsText(
					githubCli.getDownloadUrl(`svg/${iconMetaData.name}.svg`),
				);
				const optimizedSvg = optimizeSvg(iconSvgData, [
					...OPTIMIZE_SVG_PLUGIN,
					{
						name: "addAttributesToSVGElement",
						params: {
							attributes: [
								{ "data-author": iconMetaData.author },
								{ "data-license": hrefLicense },
								{ "data-alias": iconMetaData.aliases.join(", ") },
								{ "data-tags": iconMetaData.tags.join(", ") },
							],
						},
					},
				]);
				await saveFile(
					join(materialSvgPath, subFolderName),
					iconName,
					optimizedSvg,
				);
			}
		},
	);

	const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
	console.log(
		`✨ Finished! (material-icons:${processedCount}) in ${totalDuration}s.\n`,
	);
};

export default downloadMaterialFiles;
