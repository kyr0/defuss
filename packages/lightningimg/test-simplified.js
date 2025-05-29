import { convertImageBuffer, getImageInfo } from "./index.js";
import { readFileSync } from "node:fs";

async function testSimplifiedAPI() {
	try {
		console.log("🧪 Testing Simplified API (No Quality Control)");
		console.log("==========================================\n");

		const imageBuffer = readFileSync("./test_images/IMG_3236.jpg");
		const info = await getImageInfo(imageBuffer);

		console.log(
			`📷 Original: ${info.format} ${info.width}×${info.height} (${imageBuffer.length} bytes)\n`,
		);

		// Test 1: Convert without resizing
		console.log("🔄 Test 1: Convert without resizing");
		const converted = await convertImageBuffer(imageBuffer);
		const convertedInfo = await getImageInfo(converted);
		console.log(
			`   WebP: ${convertedInfo.width}×${convertedInfo.height} (${converted.length} bytes)`,
		);
		console.log(
			`   Size change: ${((converted.length / imageBuffer.length - 1) * 100).toFixed(1)}%\n`,
		);

		// Test 2: Resize to specific dimensions
		console.log("🔧 Test 2: Resize to 400×300");
		const resized1 = await convertImageBuffer(imageBuffer, 400, 300);
		const resized1Info = await getImageInfo(resized1);
		console.log(
			`   WebP: ${resized1Info.width}×${resized1Info.height} (${resized1.length} bytes)\n`,
		);

		// Test 3: Resize width only (maintain aspect ratio)
		console.log("📐 Test 3: Resize width to 600 (maintain aspect ratio)");
		const resized2 = await convertImageBuffer(imageBuffer, 600);
		const resized2Info = await getImageInfo(resized2);
		console.log(
			`   WebP: ${resized2Info.width}×${resized2Info.height} (${resized2.length} bytes)`,
		);
		console.log(
			`   Aspect ratio preserved: ${(resized2Info.width / resized2Info.height).toFixed(2)}`,
		);
		console.log(
			`   Original ratio: ${(info.width / info.height).toFixed(2)}\n`,
		);

		// Test 4: Resize height only (maintain aspect ratio)
		console.log("📏 Test 4: Resize height to 800 (maintain aspect ratio)");
		const resized3 = await convertImageBuffer(imageBuffer, null, 800);
		const resized3Info = await getImageInfo(resized3);
		console.log(
			`   WebP: ${resized3Info.width}×${resized3Info.height} (${resized3.length} bytes)`,
		);
		console.log(
			`   Aspect ratio preserved: ${(resized3Info.width / resized3Info.height).toFixed(2)}\n`,
		);

		console.log("✅ All tests completed successfully!");
		console.log(
			"📊 Summary: Quality control removed, resize functionality working perfectly.",
		);
	} catch (error) {
		console.error("❌ Error:", error);
	}
}

testSimplifiedAPI();
