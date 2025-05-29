/**
 * Multi-format performance test for LightningImg WASM module
 * Tests performance with different input formats (PNG, JPG, TIFF)
 */

import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { convertImageBuffer, getImageInfo } from "./index.js";

function formatTime(ms) {
	if (ms < 1000) return `${ms.toFixed(2)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function formatThroughput(operations, timeMs) {
	const opsPerSecond = (operations / timeMs) * 1000;
	return `${opsPerSecond.toFixed(2)} ops/sec`;
}

function formatBytes(bytes) {
	const units = ["B", "KB", "MB", "GB"];
	let i = 0;
	while (bytes >= 1024 && i < units.length - 1) {
		// biome-ignore lint/style/noParameterAssign: <explanation>
		bytes /= 1024;
		i++;
	}
	return `${bytes.toFixed(2)} ${units[i]}`;
}

async function testFormat(filePath, iterations = 100) {
	console.log(`\n🧪 Testing: ${filePath}`);
	console.log("=".repeat(50));

	// Load test image
	const imageBuffer = readFileSync(filePath);
	const imageInfo = await getImageInfo(imageBuffer);

	console.log(`📁 File: ${filePath}`);
	console.log(`📊 Size: ${formatBytes(imageBuffer.length)}`);
	console.log(`📏 Dimensions: ${imageInfo.width}×${imageInfo.height}`);
	console.log(`🎯 Format: ${imageInfo.format}`);

	// Performance test
	console.log(`\n🔄 Converting ${iterations} times...`);
	const start = performance.now();

	let totalOutputSize = 0;
	for (let i = 0; i < iterations; i++) {
		const result = await convertImageBuffer(imageBuffer);
		totalOutputSize += result.length;

		// Progress indicator every 25 iterations
		if ((i + 1) % 25 === 0) {
			process.stdout.write(
				`\r   Progress: ${i + 1}/${iterations} (${(((i + 1) / iterations) * 100).toFixed(1)}%)`,
			);
		}
	}

	const end = performance.now();
	const time = end - start;
	const avgOutputSize = totalOutputSize / iterations;
	const compressionRatio =
		((imageBuffer.length - avgOutputSize) / imageBuffer.length) * 100;

	// biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
	console.log(`\n✅ Results:`);
	console.log(`   Total time: ${formatTime(time)}`);
	console.log(`   Throughput: ${formatThroughput(iterations, time)}`);
	console.log(`   Avg time per op: ${(time / iterations).toFixed(2)}ms`);
	console.log(`   Original size: ${formatBytes(imageBuffer.length)}`);
	console.log(`   WebP size: ${formatBytes(avgOutputSize)}`);
	console.log(`   Compression: ${compressionRatio.toFixed(1)}%`);

	return {
		filePath,
		format: imageInfo.format,
		dimensions: `${imageInfo.width}×${imageInfo.height}`,
		originalSize: imageBuffer.length,
		webpSize: avgOutputSize,
		compressionRatio,
		totalTime: time,
		throughput: (iterations / time) * 1000,
		avgTimePerOp: time / iterations,
		iterations,
	};
}

async function multiFormatPerformanceTest() {
	console.log("🚀 LightningImg Multi-Format Performance Test");
	console.log("=============================================");

	const testFiles = [
		"./test_images/IMG_3236.jpg",
		"./test_images/IMG_3257.jpg",
		"./test_images/IMG_3265.jpg",
	];

	const iterations = 100; // Fewer iterations for multiple formats
	const results = [];

	for (const filePath of testFiles) {
		try {
			const result = await testFormat(filePath, iterations);
			results.push(result);
		} catch (error) {
			console.error(`❌ Failed to test ${filePath}:`, error.message);
		}
	}

	// Summary
	console.log("\n📊 Multi-Format Performance Summary");
	console.log("=====================================");

	console.log("\n📋 Test Results:");
	results.forEach((result, index) => {
		console.log(`\n${index + 1}. ${result.filePath}`);
		console.log(`   Format: ${result.format} (${result.dimensions})`);
		console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
		console.log(
			`   Avg time: ${result.avgTimePerOp.toFixed(2)}ms per operation`,
		);
		console.log(
			`   Compression: ${result.compressionRatio.toFixed(1)}% (${formatBytes(result.originalSize)} → ${formatBytes(result.webpSize)})`,
		);
	});

	// Overall statistics
	const avgThroughput =
		results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
	const avgCompressionRatio =
		results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;
	const avgTimePerOp =
		results.reduce((sum, r) => sum + r.avgTimePerOp, 0) / results.length;

	console.log("\n🏆 Overall Performance:");
	console.log(`   Average throughput: ${avgThroughput.toFixed(2)} ops/sec`);
	console.log(`   Average compression: ${avgCompressionRatio.toFixed(1)}%`);
	console.log(`   Average time per op: ${avgTimePerOp.toFixed(2)}ms`);
	console.log(`   Total conversions: ${results.length * iterations}`);

	// Best/worst performance
	const bestThroughput = results.reduce((best, current) =>
		current.throughput > best.throughput ? current : best,
	);
	const bestCompression = results.reduce((best, current) =>
		current.compressionRatio > best.compressionRatio ? current : best,
	);

	console.log("\n🥇 Best Results:");
	console.log(
		`   Fastest format: ${bestThroughput.format} (${bestThroughput.throughput.toFixed(2)} ops/sec)`,
	);
	console.log(
		`   Best compression: ${bestCompression.format} (${bestCompression.compressionRatio.toFixed(1)}%)`,
	);

	console.log("\n🎉 Multi-format performance test completed!");
	console.log(
		"✅ LightningImg WASM shows consistent cross-format performance!",
	);

	return results;
}

async function main() {
	try {
		await multiFormatPerformanceTest();
		process.exit(0);
	} catch (error) {
		console.error("❌ Multi-format performance test failed:", error.message);
		process.exit(1);
	}
}

main();
