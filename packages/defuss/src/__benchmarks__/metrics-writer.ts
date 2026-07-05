/**
 * Metrics writer for benchmark results.
 * Writes JSON to .metrics/ folder when running in Node.js (happy-dom).
 * In browser environments (Playwright/Chromium), file I/O is skipped.
 */

import type { BenchMetric } from "./metric-types.js";

/**
 * Writes collected metrics to a timestamped JSON file.
 * Uses dynamic import() so Node.js resolves node:fs but browser skips gracefully.
 */
export async function writeMetrics(
    metrics: BenchMetric[],
    type: string,
    envName: string,
): Promise<void> {
    const now = new Date();
    const ts = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const fileName = `${type}-${ts}.json`;

    const payload = {
        timestamp: now.toISOString(),
        environment: envName,
        type,
        metrics,
    };

    const json = JSON.stringify(payload, null, 2);

    try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const metricsDir = path.resolve(process.cwd(), ".metrics");
        fs.mkdirSync(metricsDir, { recursive: true });
        fs.writeFileSync(path.join(metricsDir, fileName), json);
        console.log(`\n  📊 Metrics written to .metrics/${fileName} (${envName})`);
    } catch {
        // Browser environment (Playwright) — can't write files
        console.log(`\n  📊 Metrics (${envName}) — file write skipped (browser env)`);
        console.log(`  ${json}`);
    }
}
