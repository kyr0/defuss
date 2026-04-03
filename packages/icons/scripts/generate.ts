import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {checkoutGitPath} from "./git";
import {downloadGithubFolder, getFolderTreeDirectly} from "./github";
import {
	capitalize,
	chunkArray,
	fetchAsJSON,
	fetchAsText,
	fileExists, findMaxSafe,
	optimizeSvg, pushUnique, removePrefix, removeSuffix,
	saveFile
} from "./utils";

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

const ASSETS_PATH = join(__dirname, '..', 'assets')
const BATCH_SIZE = 500

const downloadMaterialFiles = async () => {
	const startTime = performance.now();

	console.log('🚀 Starting Material Design Icons download...');

	console.log('📦 Fetching meta.json...');
	const materialDesignIcons = await fetchAsJSON<MaterialDesignMeta>("https://raw.githubusercontent.com/Templarian/MaterialDesign/master/meta.json");
	const materialAssetsPath = join(ASSETS_PATH, 'material');
	await saveFile(materialAssetsPath, 'meta.json', JSON.stringify(materialDesignIcons, null, 2))
	console.log(`✅ Saved metadata for ${materialDesignIcons.length} icons.`);

	const materialSvgPath = join(materialAssetsPath, 'svg');
	const iconChunks = chunkArray(materialDesignIcons, BATCH_SIZE);

	console.log(`📂 Processing ${iconChunks.length} batches of ${BATCH_SIZE} icons...`);
	let processedCount = 0;

	for await (const [index, iconChunk] of iconChunks.entries()) {
		const batchStartTime = performance.now();
		console.log(`⏳ Batch ${index + 1}/${iconChunks.length} starting...`);
		try {
			await Promise.all(iconChunk.map(async (iconMetaData) => {

				const iconName = iconMetaData.name.toLowerCase() + '.svg';
				const svgSavePath = join(materialSvgPath, iconName)
				if (!(await fileExists(svgSavePath))) {
					const iconSvgData = await fetchAsText(`https://raw.githubusercontent.com/Templarian/MaterialDesign/master/svg/${iconMetaData.name}.svg`)
					const optimizedSvg = optimizeSvg(iconSvgData)
					await saveFile(materialSvgPath, iconName, optimizedSvg)
				}
				processedCount++;
			}))
			const batchDuration = ((performance.now() - batchStartTime) / 1000).toFixed(2);
			console.log(`✅ Batch ${index + 1} complete. (${batchDuration}s) Total icons: ${processedCount}`);
		} catch (error) {
			console.error(`❌ Error in Batch ${index + 1}:`, error instanceof Error ? error.message : error);
			// We don't 'throw' here if you want the other batches to continue
		}
	}
	const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
	console.log(`\n✨ Finished! Processed ${processedCount} icons in ${totalDuration}s.\n`);
}

const downloadPhosphorFiles = async () => {

	const phosphorAssetPath = join(ASSETS_PATH, 'phosphor')
	const startTime = performance.now();

	const ICON_TYPES = ["regular", "thin", "light", "bold", "fill", "duotone",];
	console.log('🚀 Starting Phosphor Icons download...');
	console.log('📦 Creating meta.json...');
	const gitHubRepoSourceCodePath = join(phosphorAssetPath, 'source-code');

	await downloadGithubFolder('phosphor-icons/core', 'src', gitHubRepoSourceCodePath);

	const {icons: phosphorIcons} = await import(join(gitHubRepoSourceCodePath, 'index.ts'))
	await saveFile(phosphorAssetPath, 'meta.json', JSON.stringify(phosphorIcons, null, 2))
	console.log(`✅ Saved metadata for ${phosphorIcons.length} icons.`);

	const phosphorSvgPath = join(phosphorAssetPath, 'svg');

	const iconChunks = chunkArray(ICON_TYPES.flatMap(type => phosphorIcons.map(icon => ({...icon, type}))) as Array<{
		name: string,
		type: string
	}>, BATCH_SIZE);

	console.log(`📂 Processing ${iconChunks.length} batches of ${BATCH_SIZE} icons...`);
	let processedCount = 0;

	for await (const [index, iconChunk] of iconChunks.entries()) {
		const batchStartTime = performance.now();
		console.log(`⏳ Batch ${index + 1}/${iconChunks.length} starting...`);
		try {
			await Promise.all(iconChunk.map(async (iconMetaData) => {

				const iconName = iconMetaData.name.toLowerCase()
					+ (iconMetaData.type !== 'regular' ? '-' + iconMetaData.type : '')
					+ '.svg';
				const svgSavePath = join(phosphorSvgPath, iconMetaData.type, iconName)
				if (!(await fileExists(svgSavePath))) {
					try {

						const iconSvgData = await fetchAsText(`https://raw.githubusercontent.com/phosphor-icons/core/refs/heads/main/assets/${iconMetaData.type}/${iconName}`)
						const optimizedSvg = optimizeSvg(iconSvgData)
						await saveFile(join(phosphorSvgPath, iconMetaData.type), iconName, optimizedSvg)
					} catch (e) {
						console.error(e.message)
					}
				}
				processedCount++;
			}))
			const batchDuration = ((performance.now() - batchStartTime) / 1000).toFixed(2);
			console.log(`✅ Batch ${index + 1} complete. (${batchDuration}s) Total icons: ${processedCount}`);
		} catch (error) {
			console.error(`❌ Error in Batch ${index + 1}:`, error instanceof Error ? error.message : error);
			// We don't 'throw' here if you want the other batches to continue
		}
	}

	const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
	console.log(`\n✨ Finished! Processed ${processedCount} icons in ${totalDuration}s.\n`);

}

const downloadFluentuiSystemFiles = async () => {

	const fluentuiAssetPath = join(ASSETS_PATH, 'fluentui')
	const startTime = performance.now();

	console.log('🚀 Starting Microsofts Fluentui System Icons download...');
	console.log('📦 Creating meta.json...');

	type MetaData = {
		name: string
		size: number[]
		style: string[]
		files: Array<{ downloadPath: string, size: number, fileName: string, style: string }>
		fromFile: false
	}

	type FileMetaData = {
		name: string
		size: number[]
		style: string[]
		keyword: string
		description: string
		metaphor: string[]
		files: Array<{ downloadPath: string, size: number, fileName: string, style: string }>
		fromFile: true
	}

	let registry: Record<string, MetaData | FileMetaData> = {}
	const registryFileName = 'registry.json';
	if (await fileExists(join(fluentuiAssetPath, registryFileName))) {
		console.log('Getting registry.json from file system ')
		registry = JSON.parse((await readFile(join(fluentuiAssetPath, registryFileName))).toString())
	} else {
		const nodes = (await getFolderTreeDirectly('microsoft/fluentui-system-icons', 'assets'));
		const chunkedNodes = chunkArray(nodes, BATCH_SIZE)

		console.log(`📂 Processing ${chunkedNodes.length} batches of ${BATCH_SIZE} icon registry...`);
		let processedCount = 0;


		for await (const [index, nodeChunk] of chunkedNodes.entries()) {
			const batchStartTime = performance.now();
			console.log(`⏳ Batch ${index + 1}/${chunkedNodes.length} starting...`);

			await Promise.all(nodeChunk.map(async (node) => {
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
						const metaData = await fetchAsJSON<FileMetaData>(`https://raw.githubusercontent.com/microsoft/fluentui-system-icons/main/${join('assets', node.path)}`);
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
							style: rawStyle
						})

						registry[name] = {
							...(registry[name] ?? {
								name,
								size,
								style,
								fromFile: false
							}), files
						}
					}
				}
				processedCount++;
			}))

			const batchDuration = ((performance.now() - batchStartTime) / 1000).toFixed(2);
			console.log(`✅ Batch ${index + 1} complete. (${batchDuration}s) Total icons: ${processedCount}`);

		}

		await saveFile(fluentuiAssetPath, registryFileName, JSON.stringify(registry, null, 2));
	}
	const svgsToDownload: Array<{ downloadPath: string, size: number, fileName: string, style: string }> = []
	for (const [index, entry] of Object.entries(registry)) {
		const maxSize = findMaxSafe(entry.size)
		for (const file of entry.files) {
			if (file.size === maxSize) {
				svgsToDownload.push(file)
			}
		}
	}

	const fluentuiSvgPath = join(fluentuiAssetPath, 'svg');
	const svgsToDownloadChunks = chunkArray(svgsToDownload, BATCH_SIZE);

	for await (const [index, svgChunks] of svgsToDownloadChunks.entries()) {
		await Promise.all(svgChunks.map(async (file) => {
			const iconSvgData = await fetchAsText(`https://raw.githubusercontent.com/microsoft/fluentui-system-icons/main/${file.downloadPath}`)
			const optimizedSvg = optimizeSvg(iconSvgData, file.style === 'color')
			await saveFile(join(fluentuiSvgPath, file.style), file.fileName, optimizedSvg)
		}))
	}

	/*	for await (const folder of folders.filter(folder => folder.type === 'dir')) {
			let metaData: MetaData | FileMetaData = {
				name: folder.name,
				size: [],
				style: [],
				fromFile: false
			};
			
			try {
	
				const fileMetaData = await fetchAsJSON<FileMetaData>(`https://raw.githubusercontent.com/microsoft/fluentui-system-icons/main/${folder.path}/metadata.json`);
				fileMetaData.fromFile = true
				metaData = fileMetaData
			} catch (e) {
				// metaDataDoes not exists
			}
			
			const rawSvgInfos = await getGithubDirectoryInfo('microsoft/fluentui-system-icons', join(folder.path, 'SVG'))
				.then(svgs => svgs.filter(svg => svg.type === 'file'));
			const svgs = rawSvgInfos.map(info => {
				const {name: rawFileName, download_url, sha}=info
				const fileName = removePrefix('ic_fluent_', rawFileName);
				const nameParts = removeSuffix('.svg',fileName).split('_');
				const style = nameParts.pop();
				const size = nameParts.pop();
				const name = nameParts.join('_')
				return {
					style, size, name: folder.name, fileName: name, download_url, sha
				}
			})
			if(!metaData.fromFile){
				console.log('no metadata',svgs)
			}
			registerSvgs.push(...svgs)
		}*/
}
const main = async () => {
	await downloadMaterialFiles();
	await downloadPhosphorFiles();
	await downloadFluentuiSystemFiles()
}

main()
