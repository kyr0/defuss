import {join} from "node:path";
import {PluginConfig} from "svgo";
import {GithubCli} from "../github";
import {batchProcessing, fetchAsJSON, fetchAsText, fileExists, optimizeSvg, saveFile} from "../utils";

type MaterialDesignMeta = Array<MaterialDesignIcon>

export interface MaterialDesignIcon {
	id: string
	baseIconId: string
	name: string
	codepoint: string
	aliases: string[]
	styles: string[]
	version: string
	deprecated: boolean
	tags: string[]
	author: string
}

const OPTIMIZE_SVG_PLUGIN: PluginConfig[] = [{
	name: 'removeAttrs',
	params: {
		attrs: ['id', 'fill', 'width', 'height']
	}
},
	{
		name: 'addAttributesToSVGElement',
		params: {
			attributes: [{fill: 'currentColor'}]
		}
	}
]


const downloadMaterialFiles = async (basePath: string, batchSize: number) => {
	const startTime = performance.now();

	console.log('🚀 Starting Material Design Icons download...');
	const githubCli = await GithubCli.create('Templarian', 'MaterialDesign')

	console.log('📦 Fetching meta.json...');
	const materialDesignIcons = await fetchAsJSON<MaterialDesignMeta>(githubCli.getDownloadUrl("meta.json"));
	const materialAssetsPath = join(basePath, 'material');
	await saveFile(materialAssetsPath, 'meta.json', JSON.stringify(materialDesignIcons, null, 2))
	console.log(`✅ Saved metadata for ${materialDesignIcons.length} icons.`);

	const materialSvgPath = join(materialAssetsPath, 'svg');
	const processedCount = await batchProcessing(batchSize, materialDesignIcons, async (iconMetaData) => {
		const iconName = iconMetaData.name.toLowerCase() + '.svg';
		const svgSavePath = join(materialSvgPath, iconName)
		if (!(await fileExists(svgSavePath))) {
			const iconSvgData = await fetchAsText(githubCli.getDownloadUrl(`svg/${iconMetaData.name}.svg`))
			const optimizedSvg = optimizeSvg(iconSvgData, OPTIMIZE_SVG_PLUGIN)
			if (iconMetaData.name.endsWith('-outline')) {
				await saveFile(join(materialSvgPath, 'outline'), iconName, optimizedSvg)
			} else {
				await saveFile(join(materialSvgPath, 'regular'), iconName, optimizedSvg)
			}
		}
	})

	const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
	console.log(`✨ Finished! (material-icons:${processedCount}) in ${totalDuration}s.\n`);
}

export default downloadMaterialFiles
