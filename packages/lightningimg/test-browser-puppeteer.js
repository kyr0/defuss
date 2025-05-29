/**
 * Puppeteer-based browser test for LightningImg WASM module
 * Adapts the browser example as an automated test similar to example-simple.js
 */

import puppeteer from "puppeteer";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple HTTP server to serve files with proper MIME types
function createTestServer(port = 3000) {
	const server = createServer((req, res) => {
		const filePath = join(
			__dirname,
			req.url === "/" ? "browser-test-simple.html" : req.url,
		);

		try {
			const content = readFileSync(filePath);
			const ext = extname(filePath);

			// Set proper MIME types
			const mimeTypes = {
				".html": "text/html",
				".js": "application/javascript",
				".wasm": "application/wasm",
				".json": "application/json",
			};

			const mimeType = mimeTypes[ext] || "text/plain";
			res.writeHead(200, {
				"Content-Type": mimeType,
				"Cross-Origin-Embedder-Policy": "require-corp",
				"Cross-Origin-Opener-Policy": "same-origin",
			});
			res.end(content);
		} catch (error) {
			res.writeHead(404);
			res.end("File not found");
		}
	});

	return new Promise((resolve) => {
		server.listen(port, () => {
			console.log(`📡 Test server running on http://localhost:${port}`);
			resolve({ server, port });
		});
	});
}

async function runBrowserTest() {
	console.log("🚀 Starting LightningImg WASM Browser Test with Puppeteer\n");

	let browser;
	let serverInfo;

	try {
		// Start HTTP server
		console.log("📡 Starting test server...");
		serverInfo = await createTestServer(3000);

		// Launch browser
		console.log("🌐 Launching browser...");
		browser = await puppeteer.launch({
			headless: true, // Set to false to see the browser
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-web-security",
				"--allow-file-access-from-files",
				"--enable-local-file-accesses",
			],
		});

		const page = await browser.newPage();

		// Enable console logging from the page
		page.on("console", (msg) => {
			const type = msg.type();
			const text = msg.text();
			if (type === "error") {
				console.log(`🔴 Browser Error: ${text}`);
			} else if (type === "warn") {
				console.log(`🟡 Browser Warning: ${text}`);
			} else {
				console.log(`🔵 Browser Log: ${text}`);
			}
		});

		// Handle page errors
		page.on("pageerror", (error) => {
			console.error("❌ Page Error:", error.message);
		});

		// Navigate to the test page
		const testPageUrl = `http://localhost:${serverInfo.port}/`;
		console.log(`📄 Loading test page: ${testPageUrl}`);
		await page.goto(testPageUrl, { waitUntil: "networkidle0" });

		// Wait for test completion (with timeout)
		console.log("⏳ Waiting for tests to complete...\n");

		await page.waitForFunction(
			() => window.testResults?.completed,
			{ timeout: 30000 }, // 30 second timeout
		);

		// Get test results
		const testResults = await page.evaluate(() => window.testResults);

		// Display results
		console.log("📊 Test Results:");
		console.log("================\n");

		if (testResults.success) {
			console.log("✅ Status: SUCCESS");
			console.log(`📝 Test logs:\n${testResults.log.join("\n")}`);

			if (testResults.stats) {
				console.log("\n📈 Performance Stats:");
				console.log(`   Original PNG: ${testResults.stats.originalSize} bytes`);
				console.log(`   WebP (default): ${testResults.stats.webpSize} bytes`);

				console.log(
					`   Default compression: ${testResults.stats.defaultCompression}%`,
				);

				console.log(
					`   Image info: ${JSON.stringify(testResults.stats.imageInfo)}`,
				);
				console.log(`   Format supported: ${testResults.stats.isSupported}`);
			}
		} else {
			console.log("❌ Status: FAILED");
			console.log(`💥 Error: ${testResults.error}`);
			console.log(`📝 Test logs:\n${testResults.log.join("\n")}`);
		}

		// Take a screenshot for debugging
		const screenshotPath = join(__dirname, "test-browser-screenshot.png");
		await page.screenshot({ path: screenshotPath, fullPage: true });
		console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

		// Return success status
		return testResults.success;
	} catch (error) {
		console.error(
			"💥 Puppeteer test failed:",
			error?.message || "Unknown error",
		);
		return false;
	} finally {
		if (browser) {
			await browser.close();
			console.log("\n🔚 Browser closed");
		}
		if (serverInfo?.server) {
			serverInfo.server.close();
			console.log("🔚 Test server closed");
		}
	}
}

async function main() {
	console.log("🖼️ LightningImg WASM Browser Test (Puppeteer Edition)");
	console.log("====================================================\n");

	const success = await runBrowserTest();

	if (success) {
		console.log("\n🎉 All browser tests passed successfully!");
		console.log(
			"✅ ESM WASM-only LightningImg works perfectly in browser environment!",
		);
		process.exit(0);
	} else {
		console.log("\n❌ Browser tests failed!");
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("💥 Unexpected error:", error?.message || "Unknown error");
	process.exit(1);
});
