import {
	copyFileSync,
	cpSync,
	existsSync,
	linkSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	readlinkSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, "..");
const distDir = join(packageDir, "dist");
const runtimeDir = join(packageDir, ".container-runtime");
const runtimeNodeModulesDir = join(runtimeDir, "node_modules");
const stagedSourceFiles = ["content.ts", "path.ts", "types.ts"];

if (!existsSync(distDir)) {
	throw new Error(
		"dist/ is missing. Run `bun run build` for packages/ssg before preparing the container runtime.",
	);
}

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

const cloneDirectoryWithHardlinks = (sourcePath, targetPath) => {
	const stats = lstatSync(sourcePath);

	if (stats.isSymbolicLink()) {
		symlinkSync(readlinkSync(sourcePath), targetPath);
		return;
	}

	if (!stats.isDirectory()) {
		try {
			linkSync(sourcePath, targetPath);
		} catch {
			copyFileSync(sourcePath, targetPath);
		}
		return;
	}

	mkdirSync(targetPath, { recursive: true });
	for (const entry of readdirSync(sourcePath)) {
		cloneDirectoryWithHardlinks(
			join(sourcePath, entry),
			join(targetPath, entry),
		);
	}
};

const resolvePackageManifestPath = (packageName, resolvedFrom) => {
	let currentDir = resolvedFrom;

	while (true) {
		const manifestPath = join(
			currentDir,
			"node_modules",
			packageName,
			"package.json",
		);
		if (existsSync(manifestPath)) {
			return manifestPath;
		}

		const parentDir = dirname(currentDir);
		if (parentDir === currentDir) {
			break;
		}

		currentDir = parentDir;
	}

	throw new Error(
		`Could not locate package.json for ${packageName} from ${resolvedFrom}`,
	);
};

const collectRuntimeDependencyEntries = (manifest) => {
	const seen = new Set();
	const entries = [];

	for (const dependencyName of Object.keys(manifest.dependencies ?? {})) {
		if (seen.has(dependencyName)) continue;
		seen.add(dependencyName);
		entries.push({ name: dependencyName, optional: false });
	}

	for (const dependencyName of Object.keys(manifest.optionalDependencies ?? {})) {
		if (seen.has(dependencyName)) continue;
		seen.add(dependencyName);
		entries.push({ name: dependencyName, optional: true });
	}

	for (const dependencyName of Object.keys(manifest.peerDependencies ?? {})) {
		if (manifest.peerDependenciesMeta?.[dependencyName]?.optional === true) {
			continue;
		}

		if (seen.has(dependencyName)) continue;
		seen.add(dependencyName);
		entries.push({ name: dependencyName, optional: false });
	}

	return entries;
};

const stagePackageDirectory = (sourceDir, targetDir) => {
	mkdirSync(dirname(targetDir), { recursive: true });
	rmSync(targetDir, { recursive: true, force: true });
	cloneDirectoryWithHardlinks(sourceDir, targetDir);
	rmSync(join(targetDir, "node_modules"), { recursive: true, force: true });
};

const createRuntimeManifest = (manifest) => ({
	name: manifest.name,
	version: manifest.version,
	type: manifest.type,
	bin: manifest.bin,
	main: manifest.main,
	module: manifest.module,
	exports: manifest.exports,
	engines: manifest.engines,
	dependencies: manifest.dependencies,
	peerDependencies: manifest.peerDependencies,
	peerDependenciesMeta: manifest.peerDependenciesMeta,
});

const rootManifest = readJson(join(packageDir, "package.json"));

rmSync(runtimeDir, { recursive: true, force: true });
mkdirSync(runtimeNodeModulesDir, { recursive: true });
mkdirSync(join(runtimeDir, "src"), { recursive: true });
cpSync(distDir, join(runtimeDir, "dist"), { recursive: true });

for (const sourceFile of stagedSourceFiles) {
	cpSync(join(packageDir, "src", sourceFile), join(runtimeDir, "src", sourceFile), {
		recursive: false,
	});
}

writeFileSync(
	join(runtimeDir, "package.json"),
	`${JSON.stringify(createRuntimeManifest(rootManifest), null, 2)}\n`,
);

const stagedVersions = new Map();
const queue = collectRuntimeDependencyEntries(rootManifest).map((dependency) => ({
	...dependency,
	resolvedFrom: packageDir,
}));

while (queue.length > 0) {
	const dependency = queue.shift();
	if (!dependency) continue;

	const { name, optional, resolvedFrom } = dependency;

	let manifestPath;
	try {
		manifestPath = resolvePackageManifestPath(name, resolvedFrom);
	} catch (error) {
		if (optional) {
			console.warn(
				`[prepare-container-runtime] Skipping optional dependency ${name} from ${resolvedFrom}: ${(error).message}`,
			);
			continue;
		}

		throw error;
	}

	const sourceDir = dirname(realpathSync(manifestPath));
	const sourceManifest = readJson(manifestPath);
	const existingVersion = stagedVersions.get(name);
	if (existingVersion) {
		if (existingVersion !== sourceManifest.version) {
			console.warn(
				`[prepare-container-runtime] Keeping ${name}@${existingVersion}; skipping additional ${sourceManifest.version} resolved from ${resolvedFrom}.`,
			);
		}
		continue;
	}

	stagePackageDirectory(sourceDir, join(runtimeNodeModulesDir, name));
	stagedVersions.set(name, sourceManifest.version);

	const stagedManifest = readJson(
		join(runtimeNodeModulesDir, name, "package.json"),
	);
	for (const nextDependency of collectRuntimeDependencyEntries(stagedManifest)) {
		if (stagedVersions.has(nextDependency.name)) continue;
		queue.push({
			...nextDependency,
			resolvedFrom: sourceDir,
		});
	}
}

console.log(
	`[prepare-container-runtime] Wrote ${runtimeDir} with ${stagedVersions.size} staged runtime packages.`,
);
