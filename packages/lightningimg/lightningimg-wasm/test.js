import { convertImageBuffer, processDirectory } from "./index.js";
import { readFileSync } from "node:fs";

async function test() {
	console.log("Testing lightningimg-wasm...");

	try {
		// Test buffer conversion
		console.log("\n1. Testing buffer conversion...");
		const inputBuffer = readFileSync("../test_images/defuss_logo_png.png");
		console.log(`Input buffer size: ${inputBuffer.length} bytes`);

		const webpBuffer = await convertImageBuffer(inputBuffer);
		console.log(`WebP buffer size: ${webpBuffer.length} bytes`);
		console.log(
			`Compression ratio: ${((1 - webpBuffer.length / inputBuffer.length) * 100).toFixed(1)}%`,
		);

		// Test directory processing
		console.log("\n2. Testing directory processing...");
		await processDirectory("../test_images", "../test_output_wasm");
		console.log("Directory processing completed!");
	} catch (error) {
		console.error("Test failed:", error);
	}
}

test();
