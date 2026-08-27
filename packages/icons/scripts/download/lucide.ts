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

const OPTIMIZE_SVG_PLUGIN: PluginConfig[] = [
	{
		name: "removeAttrs",
		params: {
			attrs: ["id", "width", "height"],
		},
	},
];
const downloadLucideFiles = async (basePath: string, batchSize: number) => {
	const assetPath = join(basePath, "lucide");
	console.log("🚀 Starting Lucide Icons download...");
	const githubCli = await GithubCli.create("lucide-icons", "lucide");

	const treeNodes = await githubCli.getFolderNodes("icons");

	const nodesNodes: Record<string, { sha: string; size: number }> = treeNodes
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
		);

	await saveFile(
		assetPath,
		"github-nodes.json",
		JSON.stringify(nodesNodes, null, 2),
	);

	const svgsToDownload: Array<{ downloadPath: string; fileName: string }> = [];
	const metaDataJsons: Record<string, any> = {};
	await batchProcessing(batchSize, treeNodes, async (node) => {
		if (node.type !== "blob") {
			return;
		}
		const isMetadata = node.path.endsWith(".json");
		const isSvg = node.path.endsWith(".svg");
		if (isSvg) {
			svgsToDownload.push({
				downloadPath: join("icons", node.path),
				fileName: node.path.split("/").pop() as string,
			});
		} else if (isMetadata) {
			metaDataJsons[node.path] = await fetchAsJSON(
				githubCli.getDownloadUrl("icons/" + node.path),
			);
		}
	});
	saveFile(assetPath, "meta.json", JSON.stringify(metaDataJsons, null, 2));
	const svgPath = join(assetPath, "svg");
	await batchProcessing(batchSize, svgsToDownload, async (file) => {
		if (!(await fileExists(join(svgPath, file.fileName)))) {
			const iconSvgData = await fetchAsText(
				githubCli.getDownloadUrl(file.downloadPath),
			);
			const optimizedSvg = optimizeSvg(iconSvgData, OPTIMIZE_SVG_PLUGIN);
			await saveFile(svgPath, file.fileName, optimizedSvg);
		}
	});
};
export default downloadLucideFiles;
