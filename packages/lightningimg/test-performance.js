/**
 * Performance test for LightningImg WASM module
 * Converts the same image 100 times to measure throughput and performance
 */

import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  convertImageBuffer,
  getImageInfo,
  isSupportedFormat,
} from "./index.js";

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
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

async function performanceTest() {
  console.log("🚀 LightningImg Performance Test");
  console.log("=================================\n");

  // Load test image
  console.log("📁 Loading test image...");
  const imagePath = "./test_images/IMG_3257.jpg";
  const imageBuffer = readFileSync(imagePath);
  console.log(`📁 Test image: ${imagePath}`);
  console.log(`📊 Image size: ${formatBytes(imageBuffer.length)}\n`);

  // Get image info first (for context)
  console.log("🔍 Getting image info...");
  const imageInfo = await getImageInfo(imageBuffer);
  console.log(
    `📏 Image info: ${imageInfo.format} ${imageInfo.width}×${imageInfo.height}\n`,
  );

  const iterations = 100;
  const results = {};

  // Test 1: Basic conversion performance
  console.log(`🔄 Testing convertImageBuffer (${iterations} iterations)...`);
  const start1 = performance.now();

  let totalOutputSize = 0;
  for (let i = 0; i < iterations; i++) {
    const result = await convertImageBuffer(imageBuffer);
    totalOutputSize += result.length;

    // Progress indicator every 100 iterations
    if ((i + 1) % 100 === 0) {
      process.stdout.write(
        `\r   Progress: ${i + 1}/${iterations} (${(((i + 1) / iterations) * 100).toFixed(1)}%)`,
      );
    }
  }

  const end1 = performance.now();
  const time1 = end1 - start1;

  console.log(`\n✅ Completed ${iterations} conversions`);
  console.log(`⏱️  Total time: ${formatTime(time1)}`);
  console.log(`⚡ Throughput: ${formatThroughput(iterations, time1)}`);
  console.log(
    `📦 Average output size: ${formatBytes(totalOutputSize / iterations)}`,
  );
  console.log(
    `📈 Total data processed: ${formatBytes(imageBuffer.length * iterations)}\n`,
  );

  results.basicConversion = {
    iterations,
    totalTime: time1,
    throughput: (iterations / time1) * 1000,
    avgOutputSize: totalOutputSize / iterations,
  };

  // Test 2: Resize conversion performance
  console.log(
    `🎯 Testing convertImageBuffer with resize (${iterations} iterations, 800x600)...`,
  );
  const start2 = performance.now();

  let totalOutputSizeResize = 0;
  for (let i = 0; i < iterations; i++) {
    const result = await convertImageBuffer(imageBuffer, 800, 600);
    totalOutputSizeResize += result.length;

    // Progress indicator every 100 iterations
    if ((i + 1) % 100 === 0) {
      process.stdout.write(
        `\r   Progress: ${i + 1}/${iterations} (${(((i + 1) / iterations) * 100).toFixed(1)}%)`,
      );
    }
  }

  const end2 = performance.now();
  const time2 = end2 - start2;

  console.log(`\n✅ Completed ${iterations} resize conversions`);
  console.log(`⏱️  Total time: ${formatTime(time2)}`);
  console.log(`⚡ Throughput: ${formatThroughput(iterations, time2)}`);
  console.log(
    `📦 Average output size: ${formatBytes(totalOutputSizeResize / iterations)}`,
  );
  console.log(
    `📈 Total data processed: ${formatBytes(imageBuffer.length * iterations)}\n`,
  );

  results.resizeConversion = {
    iterations,
    totalTime: time2,
    throughput: (iterations / time2) * 1000,
    avgOutputSize: totalOutputSizeResize / iterations,
  };

  // Test 3: Image info extraction performance
  console.log(`🔍 Testing getImageInfo (${iterations} iterations)...`);
  const start3 = performance.now();

  for (let i = 0; i < iterations; i++) {
    await getImageInfo(imageBuffer);

    // Progress indicator every 100 iterations
    if ((i + 1) % 100 === 0) {
      process.stdout.write(
        `\r   Progress: ${i + 1}/${iterations} (${(((i + 1) / iterations) * 100).toFixed(1)}%)`,
      );
    }
  }

  const end3 = performance.now();
  const time3 = end3 - start3;

  console.log(`\n✅ Completed ${iterations} info extractions`);
  console.log(`⏱️  Total time: ${formatTime(time3)}`);
  console.log(`⚡ Throughput: ${formatThroughput(iterations, time3)}`);
  console.log(
    `📈 Total data processed: ${formatBytes(imageBuffer.length * iterations)}\n`,
  );

  results.infoExtraction = {
    iterations,
    totalTime: time3,
    throughput: (iterations / time3) * 1000,
  };

  // Test 4: Format validation performance
  console.log(`✅ Testing isSupportedFormat (${iterations} iterations)...`);
  const start4 = performance.now();

  for (let i = 0; i < iterations; i++) {
    await isSupportedFormat(imageBuffer);

    // Progress indicator every 100 iterations
    if ((i + 1) % 100 === 0) {
      process.stdout.write(
        `\r   Progress: ${i + 1}/${iterations} (${(((i + 1) / iterations) * 100).toFixed(1)}%)`,
      );
    }
  }

  const end4 = performance.now();
  const time4 = end4 - start4;

  console.log(`\n✅ Completed ${iterations} format validations`);
  console.log(`⏱️  Total time: ${formatTime(time4)}`);
  console.log(`⚡ Throughput: ${formatThroughput(iterations, time4)}`);
  console.log(
    `📈 Total data processed: ${formatBytes(imageBuffer.length * iterations)}\n`,
  );

  results.formatValidation = {
    iterations,
    totalTime: time4,
    throughput: (iterations / time4) * 1000,
  };

  // Performance Summary
  console.log("📊 Performance Summary");
  console.log("======================");
  console.log(
    `📷 Test Image: ${formatBytes(imageBuffer.length)} (${imageInfo.width}×${imageInfo.height} ${imageInfo.format})`,
  );
  console.log(`🔢 Iterations: ${iterations} per test\n`);

  console.log("⚡ Throughput Results:");
  console.log(
    `   Basic Conversion:    ${results.basicConversion.throughput.toFixed(2)} ops/sec`,
  );
  console.log(
    `   Resize Conversion:   ${results.resizeConversion.throughput.toFixed(2)} ops/sec`,
  );
  console.log(
    `   Info Extraction:     ${results.infoExtraction.throughput.toFixed(2)} ops/sec`,
  );
  console.log(
    `   Format Validation:   ${results.formatValidation.throughput.toFixed(2)} ops/sec\n`,
  );

  console.log("⏱️  Average Operation Time:");
  console.log(
    `   Basic Conversion:    ${(results.basicConversion.totalTime / iterations).toFixed(2)}ms per operation`,
  );
  console.log(
    `   Resize Conversion:   ${(results.resizeConversion.totalTime / iterations).toFixed(2)}ms per operation`,
  );
  console.log(
    `   Info Extraction:     ${(results.infoExtraction.totalTime / iterations).toFixed(2)}ms per operation`,
  );
  console.log(
    `   Format Validation:   ${(results.formatValidation.totalTime / iterations).toFixed(2)}ms per operation\n`,
  );

  // Calculate compression ratio
  const compressionRatio =
    ((imageBuffer.length - results.basicConversion.avgOutputSize) /
      imageBuffer.length) *
    100;
  console.log("📈 Compression Results:");
  console.log(`   Original size:       ${formatBytes(imageBuffer.length)}`);
  console.log(
    `   WebP size (default): ${formatBytes(results.basicConversion.avgOutputSize)}`,
  );
  console.log(
    `   WebP size (resized): ${formatBytes(results.resizeConversion.avgOutputSize)}`,
  );
  console.log(`   Compression ratio:   ${compressionRatio.toFixed(1)}%\n`);

  console.log("🎉 Performance test completed successfully!");
  console.log("✅ ESM WASM-only LightningImg shows excellent performance!");

  return results;
}

async function main() {
  try {
    await performanceTest();
    process.exit(0);
  } catch (error) {
    console.error("❌ Performance test failed:", error.message);
    process.exit(1);
  }
}

main();
