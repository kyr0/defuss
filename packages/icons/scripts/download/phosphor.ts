import {join} from "node:path";
import {PluginConfig} from "svgo";
import {GithubCli} from "../github";
import {batchProcessing, fetchAsText, fileExists, optimizeSvg, saveFile} from "../utils";

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

const downloadPhosphorFiles = async (basePath: string, batchSize: number) => {

	const phosphorAssetPath = join(basePath, 'phosphor')
	const startTime = performance.now();

	const ICON_TYPES = ["regular", "thin", "light", "bold", "fill", "duotone",];
	console.log('🚀 Starting Phosphor Icons download...');
	const githubCli = await GithubCli.create('phosphor-icons', 'core')

	console.log('📦 Creating meta.json...');
	const gitHubRepoSourceCodePath = join(phosphorAssetPath, 'source-code');

	await githubCli.getDirectoryInfo('src').then((response) => {
		return Promise.all(response.map(async (file) => {
			if (file.type === 'file') {
				console.log(`Downloading ${file.name}...`);
				const content = await fetchAsText(file.download_url);
				await saveFile(gitHubRepoSourceCodePath, file.name, content)
			}
		}))
	});

	const {icons: phosphorIcons} = await import(join(gitHubRepoSourceCodePath, 'index.ts'))
	await saveFile(phosphorAssetPath, 'meta.json', JSON.stringify(phosphorIcons, null, 2))
	console.log(`✅ Saved metadata for ${phosphorIcons.length} icons.`);

	const phosphorSvgPath = join(phosphorAssetPath, 'svg');

	const processedCount = await batchProcessing(
		batchSize,
		ICON_TYPES.flatMap(type => phosphorIcons.map(icon => ({...icon, type}))) as Array<{
			name: string,
			type: string
		}>,
		async (iconMetaData) => {

			const iconName = iconMetaData.name.toLowerCase()
				+ (iconMetaData.type !== 'regular' ? '-' + iconMetaData.type : '')
				+ '.svg';
			const svgSavePath = join(phosphorSvgPath, iconMetaData.type, iconName)
			if (!(await fileExists(svgSavePath))) {
				try {
					const iconSvgData = await fetchAsText(githubCli.getDownloadUrl(`assets/${iconMetaData.type}/${iconName}`))
					const optimizedSvg = optimizeSvg(iconSvgData, OPTIMIZE_SVG_PLUGIN)
					await saveFile(join(phosphorSvgPath, iconMetaData.type), iconName, optimizedSvg)
				} catch (e) {
					console.error(e.message)
				}
			}
		}
	);
	const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
	console.log(`✨ Finished! Processed ${processedCount} icons in ${totalDuration}s.\n`);
}

export default downloadPhosphorFiles
