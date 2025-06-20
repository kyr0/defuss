import "dotenv/config";
import { promises as fs } from "node:fs";

// 1. Copy src/background.js to dist/assets/background.js
console.log("Copying background.js to dist/assets...");
await fs.mkdir("dist/assets", { recursive: true });
await fs.copyFile("src/background.js", "dist/assets/background.js");

// 2. Create iOS directories
console.log("Creating iOS directories...");
await fs.mkdir("ios/App/App/assets", { recursive: true });
await fs.mkdir("ios/App/App/public/assets", { recursive: true });

// 3. Copy to iOS App public assets (this is where iOS expects it...)
console.log("Copying to iOS App/public/assets...");
await fs.copyFile(
  "dist/assets/background.js",
  "ios/App/App/public/assets/background.js",
);

console.log("Background build process completed successfully!");
