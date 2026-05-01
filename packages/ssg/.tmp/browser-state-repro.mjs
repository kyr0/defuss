import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";

const require = createRequire("/Users/admin/Code/defuss/packages/defuss/package.json");
const playwright = (await import(require.resolve("playwright"))).default;
const { chromium } = playwright;

const pageUrl = process.env.SSG_REPRO_URL || "http://127.0.0.1:3100/";
const pageFile = "/Users/admin/Code/defuss/example-ssg/pages/index.mdx";
const markerBase = "Welcome to the defuss-ssg example website!";
const nextMarker = `Welcome to the defuss-ssg example website! [browser-state-${Date.now()}]`;

const originalSource = await readFile(pageFile, "utf8");
if (!originalSource.includes(markerBase)) {
  throw new Error("Could not find target page text in index.mdx");
}
const updatedSource = originalSource.replace(markerBase, nextMarker);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleMessages = [];
const start = Date.now();
const now = () => Date.now() - start;

page.on("console", (msg) => {
  consoleMessages.push({ t: now(), type: msg.type(), text: msg.text() });
});

try {
  await page.goto(pageUrl, { waitUntil: "networkidle" });

  const nameInput = page.locator('input[placeholder="name"]').first();

  await nameInput.waitFor({ state: "visible", timeout: 15000 });

  await nameInput.fill("PersistedName");

  const before = await page.evaluate(() => ({
    inputValue: document.querySelector('input[placeholder="name"]')?.value ?? null,
    hasMarker: document.body.textContent?.includes('[browser-state-') ?? false,
  }));

  await writeFile(pageFile, updatedSource, 'utf8');

  await page.waitForFunction(
    (marker) => document.body.textContent?.includes(marker) ?? false,
    nextMarker,
    { timeout: 15000 },
  );

  const after = await page.evaluate(() => ({
    inputValue: document.querySelector('input[placeholder="name"]')?.value ?? null,
    bodyText: document.body.textContent ?? '',
  }));

  console.log(JSON.stringify({
    before,
    after: {
      inputValue: after.inputValue,
      markerPresent: after.bodyText.includes('[browser-state-'),
    },
    statePreserved: before.inputValue === after.inputValue,
    consoleMessages: consoleMessages.slice(-80),
  }, null, 2));
} finally {
  await writeFile(pageFile, originalSource, 'utf8');
  await browser.close();
}
