 LightningImg Performance Test
=================================

📁 Loading test image...
📁 Test image: ./test_images/IMG_3257.jpg
📊 Image size: 180.45 KB

🔍 Getting image info...
✅ Loaded Node.js WASM module
📏 Image info: JPEG 835×1113

🔄 Testing convertImageBuffer (1000 iterations)...
   Progress: 1000/1000 (100.0%)
✅ Completed 1000 conversions
⏱️  Total time: 16.25s
⚡ Throughput: 61.54 ops/sec
📦 Average output size: 757.55 KB
📈 Total data processed: 176.22 MB

🎯 Testing convertImageBuffer with resize (1000 iterations, 800x600)...
   Progress: 1000/1000 (100.0%)
✅ Completed 1000 resize conversions
⏱️  Total time: 25.48s
⚡ Throughput: 39.25 ops/sec
📦 Average output size: 310.41 KB
📈 Total data processed: 176.22 MB

🔍 Testing getImageInfo (1000 iterations)...
   Progress: 1000/1000 (100.0%)
✅ Completed 1000 info extractions
⏱️  Total time: 6.70s
⚡ Throughput: 149.20 ops/sec
📈 Total data processed: 176.22 MB

✅ Testing isSupportedFormat (1000 iterations)...
   Progress: 1000/1000 (100.0%)
✅ Completed 1000 format validations
⏱️  Total time: 3.25ms
⚡ Throughput: 307913.44 ops/sec
📈 Total data processed: 176.22 MB

📊 Performance Summary
======================
📷 Test Image: 180.45 KB (835×1113 JPEG)
🔢 Iterations: 1000 per test

⚡ Throughput Results:
   Basic Conversion:    61.54 ops/sec
   Resize Conversion:   39.25 ops/sec
   Info Extraction:     149.20 ops/sec
   Format Validation:   307913.44 ops/sec

⏱️  Average Operation Time:
   Basic Conversion:    16.25ms per operation
   Resize Conversion:   25.48ms per operation
   Info Extraction:     6.70ms per operation
   Format Validation:   0.00ms per operation

📈 Compression Results:
   Original size:       180.45 KB
   WebP size (default): 757.55 KB
   WebP size (resized): 310.41 KB
   Compression ratio:   -319.8%

🎉 Performance test completed successfully!
✅ ESM WASM-only LightningImg shows excellent performance!