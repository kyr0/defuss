/**
 * Simple example of using LightningImg ESM WASM-only implementation
 */

import { readFileSync, writeFileSync } from "node:fs";
import { convertImageBuffer, getImageInfo } from "./index.js";

async function simpleExample() {
  console.log("🖼️ LightningImg WASM Example\n");

  try {
    // Read an image file
    const imagePath = "./test_images/IMG_3257.jpg";
    const imageBuffer = readFileSync(imagePath);
    console.log(`📁 Original file: ${imagePath}`);
    console.log(`📊 Original size: ${imageBuffer.length} bytes`);

    // Get image information
    const info = await getImageInfo(imageBuffer);
    console.log(`📏 Dimensions: ${info.width}×${info.height}`);
    console.log(`🎯 Original format: ${info.format}\n`);

    // Convert to WebP with default quality
    console.log("🔄 Converting to WebP (default quality)...");
    const webpBuffer = await convertImageBuffer(imageBuffer);
    console.log(`📦 WebP size: ${webpBuffer.length} bytes`);

    // Save the converted image
    const outputPath = "./test_output/converted_default.webp";
    writeFileSync(outputPath, webpBuffer);
    console.log(`💾 Saved to: ${outputPath}\n`);

    // Convert with resize
    console.log("🔄 Converting to WebP with resize (800×600)...");
    const webpBufferResized = await convertImageBuffer(imageBuffer, 800, 600);
    console.log(`📦 WebP size (resized): ${webpBufferResized.length} bytes`);

    // Save the resized version
    const outputPathResized = "./test_output/converted_resized.webp";
    writeFileSync(outputPathResized, webpBufferResized);
    console.log(`💾 Saved to: ${outputPathResized}\n`);

    console.log("✅ Example completed successfully!");
    console.log("🎉 ESM WASM-only LightningImg is working perfectly!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

simpleExample();
