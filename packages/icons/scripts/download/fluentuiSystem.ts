import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {PluginConfig} from "svgo";
import {GithubCli} from "../github";
import {
	batchProcessing,
	capitalize, fetchAsJSON,
	fetchAsText,
	fileExists,
	findMaxSafe,
	optimizeSvg,
	pushUnique, removePrefix, removeSuffix,
	saveFile,
} from "../utils";

type File = { downloadPath: string, size: number, fileName: string, style: string, hash: string }

type MetaData = {
	name: string
	size: number[]
	style: string[]
	files: Array<File>
	fromFile: false
}
type FileMetaData = {
	name: string
	size: number[]
	style: string[]
	keyword: string
	description: string
	metaphor: string[]
	files: Array<File>
	fromFile: true
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

const OPTIMIZE_SVG_PLUGIN_COLOR: PluginConfig[] = [{
	name: 'removeAttrs',
	params: {
		attrs: ['width', 'height']
	}
}]

const downloadFluentuiSystemFiles = async (basePath: string, batchSize: number) => {

	const fluentuiAssetPath = join(basePath, 'fluentui')
	const startTime = performance.now();

	console.log('🚀 Starting Microsofts Fluentui System Icons download...');
	const githubCli = await GithubCli.create('microsoft', 'fluentui-system-icons')
	console.log('📦 Creating register.json...');


	let registry: Record<string, MetaData | FileMetaData> = {}
	const registryFileName = 'registry.json';
	if (await fileExists(join(fluentuiAssetPath, registryFileName))) {
		console.log('Getting registry.json from file system ')
		registry = JSON.parse((await readFile(join(fluentuiAssetPath, registryFileName))).toString())
	} else {
		const nodes = (await githubCli.getFolderNodes('assets'));
		await batchProcessing(batchSize, nodes, async (node) => {
			if (node.type !== 'blob') {
				return;
			}
			const isMetadata = node.path.endsWith('/metadata.json');
			const isSvg = node.path.endsWith('.svg');
			if (isMetadata || isSvg) {
				const [name, ...other] = node.path.split('/');
				const rawFileName = other.pop();
				const files = registry[name]?.['files'] ?? []
				const size = registry[name]?.['size'] ?? []
				const style = registry[name]?.['style'] ?? []
				if (isMetadata) {
					const metaData = await fetchAsJSON<FileMetaData>(githubCli.getDownloadUrl(['assets', node.path].join('/')));
					registry[name] = {...(registry[name] ?? {}), ...metaData, files}
				} else {
					const fileNameParts = removeSuffix('.svg', removePrefix('ic_fluent_', rawFileName)).split('_');
					const rawStyle = fileNameParts.pop();
					const rawSize = fileNameParts.pop();
					const fileName = fileNameParts.join('_')
						+ (rawStyle !== 'regular' ? '_' + rawStyle : '')
						+ '.svg'
					pushUnique(style, capitalize(rawStyle));
					pushUnique(size, parseInt(rawSize));

					files.push({
						fileName,
						downloadPath: join('assets', node.path),
						size: parseInt(rawSize),
						hash: node.sha,
						style: rawStyle
					})

					registry[name] = {
						...(registry[name] ?? {
							name,
							size,
							style,
							hash: node.sha,
							fromFile: false
						}), files
					}
				}
			}
		})
		await saveFile(fluentuiAssetPath, registryFileName, JSON.stringify(registry, null, 2));
		console.log(`Finished building registry with ${Object.keys(registry).length}`)
	}

	const svgsToDownload: Array<File> = []
	for (const [index, entry] of Object.entries(registry)) {
		const maxSize = findMaxSafe(entry.size)
		for (const file of entry.files) {
			if (file.size === maxSize) {
				svgsToDownload.push(file)
			}
		}
	}

	const fluentuiSvgPath = join(fluentuiAssetPath, 'svg');

	const processedCount = await batchProcessing(batchSize, svgsToDownload, async (file) => {
		const filePath = join(fluentuiSvgPath, file.style);
		if (!await fileExists(join(filePath, file.fileName))) {
			const iconSvgData = await fetchAsText(githubCli.getDownloadUrl(file.downloadPath));
			const optimizedSvg = optimizeSvg(iconSvgData, file.style === 'color' ? OPTIMIZE_SVG_PLUGIN_COLOR : OPTIMIZE_SVG_PLUGIN)
			await saveFile(filePath, file.fileName, optimizedSvg)
		}
	});
	const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
	console.log(`✨ Finished! (FluentuiSystem:${processedCount}) in ${totalDuration}s.\n`);

}

export default downloadFluentuiSystemFiles
