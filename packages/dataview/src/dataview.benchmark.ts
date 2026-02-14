import { performance } from "node:perf_hooks";
import {
  addRows,
  applyDataview,
  createDataview,
  removeRows,
  toggleExpanded,
  toggleSelectedRow,
  updateMeta,
  updateRows,
} from "./index.js";

type BenchRow = {
  id: number;
  parentId: number | null;
  score: number;
  status: "active" | "inactive";
  tags: string[];
  title: string;
  meta: { city: "Berlin" | "Munich" | "Hamburg" };
};

const sizes = [10_000, 50_000, 1_000_000] as const;

const runsBySize: Record<(typeof sizes)[number], number> = {
  10_000: 7,
  50_000: 5,
  1_000_000: 1,
};

const createDataset = (size: number): BenchRow[] =>
  Array.from({ length: size }, (_, index) => ({
    id: index,
    parentId: index === 0 ? null : Math.floor((index - 1) / 4),
    score: index % 100,
    status: index % 2 === 0 ? "active" : "inactive",
    tags: [index % 3 === 0 ? "vip" : "regular", `tier-${index % 5}`],
    title: `Node-${index}`,
    meta: {
      city: index % 7 === 0 ? "Berlin" : index % 7 === 1 ? "Hamburg" : "Munich",
    },
  }));

const createFlatView = () =>
  createDataview({
    filters: [
      { field: "status", op: "eq", value: "active" },
      { field: "tags", op: "contains", value: "vip" },
      { field: "score", op: "gte", value: 30 },
      { field: "meta.city", op: "in", value: ["Berlin", "Hamburg"] },
    ],
    sorters: [
      { field: "score", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
    page: 2,
    pageSize: 50,
  });

const createTreeView = () =>
  createDataview({
    tree: {
      idField: "id",
      parentIdField: "parentId",
      expandedIds: [0, 1, 2, 3, 4, 5],
      includeAncestors: true,
      includeDescendantsOfMatch: false,
    },
    filters: [{ field: "title", op: "contains", value: "Node-1" }],
    sorters: [{ field: "id", dir: "asc" }],
    page: 0,
    pageSize: 100,
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
  console.log(`${label.padEnd(52)} ${duration.toFixed(2)}ms`);
  return duration;
};

const printScenarioSummary = (name: string, samples: number[]) => {
  const scenarioStats = stats(samples);
  console.log(
    `  ${name.padEnd(30)} min=${scenarioStats.min.toFixed(2)}ms avg=${scenarioStats.avg.toFixed(2)}ms median=${scenarioStats.median.toFixed(2)}ms max=${scenarioStats.max.toFixed(2)}ms`,
  );
};

const run = () => {
  console.log("defuss-dataview benchmark (non-gating)");
  console.log(`node ${process.version}`);
  console.log("scenarios: basic apply, repeated apply, interaction loop, data patch loop, tree apply");

  for (const size of sizes) {
    const runs = runsBySize[size];

    console.log(`\nDataset: ${size.toLocaleString()} rows`);
    console.log(`runs per scenario: ${runs}`);

    const data = createDataset(size);
    const flatView = createFlatView();
    const treeView = createTreeView();

    applyDataview(data, flatView);
    applyDataview(data, treeView);

    const basicApplySamples: number[] = [];
    const repeatApplySamples: number[] = [];
    const interactionSamples: number[] = [];
    const patchLoopSamples: number[] = [];
    const treeApplySamples: number[] = [];

    for (let index = 0; index < runs; index++) {
      basicApplySamples.push(
        measure(`basic apply [run ${index + 1}]`, () => {
          const result = applyDataview(data, flatView);
          if (result.length > 50) {
            throw new Error("unexpected result size");
          }
        }),
      );

      repeatApplySamples.push(
        measure(`repeat x3 same backing [run ${index + 1}]`, () => {
          applyDataview(data, flatView);
          applyDataview(data, flatView);
          applyDataview(data, flatView);
        }),
      );

      interactionSamples.push(
        measure(`interaction loop [run ${index + 1}]`, () => {
          let view = flatView;
          view = toggleSelectedRow(view, 10);
          view = toggleSelectedRow(view, 11);
          view = updateMeta(view, { lockedColumns: ["id", "score"] });
          if (view.tree) {
            view = toggleExpanded(view, 1);
          }
          applyDataview(data, view);
        }),
      );

      patchLoopSamples.push(
        measure(`data update/add/remove [run ${index + 1}]`, () => {
          let local = data;
          local = updateRows(local, [1, 2], [{ score: 99 }, { title: "Updated" }]);
          local = addRows(local, [{
            id: size + index + 1,
            parentId: null,
            score: 42,
            status: "active",
            tags: ["vip", "tier-0"],
            title: `Inserted-${index}`,
            meta: { city: "Berlin" },
          }]);
          local = removeRows(local, [3, 4]);
          applyDataview(local, flatView);
        }),
      );

      treeApplySamples.push(
        measure(`tree apply + expand [run ${index + 1}]`, () => {
          let view = treeView;
          view = toggleExpanded(view, 1);
          view = toggleExpanded(view, 2);
          applyDataview(data, view);
        }),
      );
    }

    console.log("summary:");
    printScenarioSummary("basic apply", basicApplySamples);
    printScenarioSummary("repeat x3", repeatApplySamples);
    printScenarioSummary("interaction loop", interactionSamples);
    printScenarioSummary("data update/add/remove", patchLoopSamples);
    printScenarioSummary("tree apply + expand", treeApplySamples);
  }
};

run();
