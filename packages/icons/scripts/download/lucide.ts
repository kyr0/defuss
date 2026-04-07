import {join} from "node:path";
import {PluginConfig} from "svgo";
import {GithubCli} from "../github";
import {batchProcessing, fetchAsText, fileExists, optimizeSvg, saveFile} from "../utils";

const OPTIMIZE_SVG_PLUGIN: PluginConfig[] = [{
	name: 'removeAttrs',
	params: {
		attrs: ['id', 'width', 'height']
	}
}]
const downloadLucideFiles = async (basePath: string, batchSize: number) => {
	const assetPath = join(basePath, 'lucide')
	console.log('🚀 Starting Lucide Icons download...');
	const githubCli = await GithubCli.create('lucide-icons', 'lucide')

	const treeNodes = await githubCli.getFolderNodes('icons')

	const svgsToDownload: Array<{ downloadPath: string, fileName: string }> = []

	await batchProcessing(batchSize, treeNodes, async (node) => {
		if (node.type !== 'blob') {
			return;
		}
		const isMetadata = node.path.endsWith('.json');
		const isSvg = node.path.endsWith('.svg');
		if (isSvg) {
			svgsToDownload.push({downloadPath: join('icons', node.path), fileName: node.path.split('/').pop()})
		} else if (isMetadata) {
			console.log(node)
		}
	});
	const svgPath = join(assetPath, 'svg')
	await batchProcessing(batchSize, svgsToDownload, async (file) => {
		if (!await fileExists(join(svgPath, file.fileName))) {
			const iconSvgData = await fetchAsText(githubCli.getDownloadUrl(file.downloadPath))
			const optimizedSvg = optimizeSvg(iconSvgData, OPTIMIZE_SVG_PLUGIN)
			await saveFile(svgPath, file.fileName, optimizedSvg)
		}
	})
}
export default downloadLucideFiles
