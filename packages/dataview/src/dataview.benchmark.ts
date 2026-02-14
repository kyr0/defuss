import { performance } from "node:perf_hooks";
import { applyDataview, createDataview } from "./index.js";

type BenchRow = {
  id: number;
  score: number;
  status: "active" | "inactive";
  tags: string[];
  meta: { city: "Berlin" | "Munich" | "Hamburg" };
};

const sizes = [10_000, 50_000] as const;
const runs = 7;

const createDataset = (size: number): BenchRow[] =>
  Array.from({ length: size }, (_, index) => ({
    id: index,
    score: index % 100,
    status: index % 2 === 0 ? "active" : "inactive",
    tags: [index % 3 === 0 ? "vip" : "regular", `tier-${index % 5}`],
    meta: {
      city: index % 7 === 0 ? "Berlin" : index % 7 === 1 ? "Hamburg" : "Munich",
    },
  }));

const createView = () =>
  createDataview({
    filters: [
      { field: "status", op: "eq", value: "active" },
      { field: "tags", op: "contains", value: "vip" },
      { field: "score", op: "gte", value: 30 },
      { field: "meta.city", op: "in", value: ["Berlin", "Hamburg"] },
    ],
    sorters: [
      { field: "score", direction: "desc" },
      { field: "id", direction: "asc" },
    ],
    page: 2,
    pageSize: 50,
  });

const stats = (samples: number[]) => {
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;

  return { min, max, avg, median };
};

const measure = (label: string, fn: () => void): number => {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;
  console.log(`${label.padEnd(40)} ${duration.toFixed(2)}ms`);
  return duration;
};

const run = () => {
  console.log("defuss-dataview benchmark (non-gating)");
  console.log(`node ${process.version}`);
  console.log(`runs per scenario: ${runs}`);

  for (const size of sizes) {
    console.log(`\nDataset: ${size.toLocaleString()} rows`);

    const data = createDataset(size);
    const view = createView();

    applyDataview(data, view);

    const singleApplySamples: number[] = [];
    const repeatApplySamples: number[] = [];

    for (let index = 0; index < runs; index++) {
      singleApplySamples.push(
        measure(`single apply [run ${index + 1}]`, () => {
          const result = applyDataview(data, view);
          if (result.length > 50) {
            throw new Error("unexpected result size");
          }
        }),
      );

      repeatApplySamples.push(
        measure(`repeat x3 same backing [run ${index + 1}]`, () => {
          applyDataview(data, view);
          applyDataview(data, view);
          applyDataview(data, view);
        }),
      );
    }

    const singleStats = stats(singleApplySamples);
    const repeatStats = stats(repeatApplySamples);

    console.log("summary: single apply");
    console.log(
      `  min=${singleStats.min.toFixed(2)}ms avg=${singleStats.avg.toFixed(2)}ms median=${singleStats.median.toFixed(2)}ms max=${singleStats.max.toFixed(2)}ms`,
    );
    console.log("summary: repeat x3 same backing array");
    console.log(
      `  min=${repeatStats.min.toFixed(2)}ms avg=${repeatStats.avg.toFixed(2)}ms median=${repeatStats.median.toFixed(2)}ms max=${repeatStats.max.toFixed(2)}ms`,
    );
  }
};

run();
