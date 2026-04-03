import {execSync} from "node:child_process";
import {rmSync, existsSync, mkdirSync} from "node:fs";
import {join} from "node:path";

// Paths must be absolute when changing CWD
const swcBin = join(process.cwd(), "node_modules/.bin/swc");
const swcConfig = join(process.cwd(), ".swcrc");

async function runRustBuild() {

	console.log("🦀 Starting Rust-powered build (SWC)...");


	try {
		// 2. Build ESM
		console.log("📦 Generating ESM (Flat)...");
		/*
		execSync(
			`${process.execPath} ${swcBin} . -d ${esmDist} --config-file ${swcConfig}`,
			{
				stdio: "inherit",
				cwd: iconsSrc, // 👈 This makes SWC treat the icons folder as the "root"
			},
		);
		*/

		// 3. Build CJS (We override the module type for this pass)
		console.log("📦 Generating CJS (Flat)...");
		/*
		execSync(
			`${process.execPath} ${swcBin} . -d ${cjsDist} --config-file ${swcConfig} -C module.type=commonjs`,
			{
				stdio: "inherit",
				cwd: iconsSrc, // 👈 Same here
			},
		);
		*/

		console.log("✅ JS Build complete.");
	} catch (e) {
		console.error("❌ Rust build failed", e);
	}

	console.timeEnd("Rust Build Duration");

	// 4. Types (Still need tsc for this)
	console.log("📝 Generating types...");
	//execSync("tsc -p tsconfig.json --emitDeclarationOnly");
}

(async () => {
	console.time("Total Duration");
	await runRustBuild();
	console.timeEnd("Total Duration");
})();
