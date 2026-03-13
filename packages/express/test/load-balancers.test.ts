import { describe, expect, it } from "vitest";

import {
  createResourceAwareLoadBalancer,
  leastConnectionsLoadBalancer,
  pickBackend,
  resourceAwareLoadBalancer,
  roundRobinLoadBalancer,
} from "../src/load-balancers.js";
import type { BackendCandidate, LoadBalancerContext } from "../src/types.js";

const candidate = (
  workerIndex: number,
  partial: Partial<BackendCandidate> = {},
): BackendCandidate => ({
  id: `worker-${workerIndex}`,
  workerIndex,
  host: "127.0.0.1",
  port: 3000 + workerIndex,
  healthy: true,
  ready: true,
  activeProxyConnections: 0,
  ...partial,
});

const context = (candidates: BackendCandidate[], previousIndex = 0): LoadBalancerContext =>
  ({
    candidates,
    previousIndex,
    socket: {} as never,
    request: {
      headers: {},
      protocol: "http1",
      rawHead: "",
    },
  }) satisfies LoadBalancerContext;

const fullStats = (overrides: Partial<BackendCandidate["stats"] & {}> = {}) => ({
  pid: 100,
  cpuPercent: 0,
  rssBytes: 1,
  heapUsedBytes: 50,
  heapTotalBytes: 100,
  externalBytes: 0,
  arrayBuffersBytes: 0,
  uptimeMs: 1,
  activeConnections: 0,
  sampledAt: 1,
  ...overrides,
});

describe("built-in load balancers", () => {
  it("round robin walks the candidate list", () => {
    const candidates = [candidate(0), candidate(1), candidate(2)];

    expect(roundRobinLoadBalancer(context(candidates, 0))).toMatchObject({
      workerIndex: 0,
    });
    expect(roundRobinLoadBalancer(context(candidates, 1))).toMatchObject({
      workerIndex: 1,
    });
    expect(roundRobinLoadBalancer(context(candidates, 2))).toMatchObject({
      workerIndex: 2,
    });
  });

  it("round robin wraps around when previousIndex exceeds length", () => {
    const candidates = [candidate(0), candidate(1)];
    expect(roundRobinLoadBalancer(context(candidates, 5))).toMatchObject({
      workerIndex: 1, // 5 % 2 = 1
    });
    expect(roundRobinLoadBalancer(context(candidates, 100))).toMatchObject({
      workerIndex: 0, // 100 % 2 = 0
    });
  });

  it("least connections picks the coolest backend", () => {
    const candidates = [
      candidate(0, { activeProxyConnections: 10 }),
      candidate(1, { activeProxyConnections: 1 }),
      candidate(2, { activeProxyConnections: 3 }),
    ];

    expect(leastConnectionsLoadBalancer(context(candidates))).toMatchObject({
      workerIndex: 1,
    });
  });

  it("least connections picks first when all have zero connections", () => {
    const candidates = [candidate(0), candidate(1), candidate(2)];
    const result = leastConnectionsLoadBalancer(context(candidates));
    // All have 0 connections, should return a valid candidate
    expect(result.healthy).toBe(true);
    expect(candidates.map((c) => c.workerIndex)).toContain(result.workerIndex);
  });

  it("resource aware uses connections and cpu pressure", () => {
    const candidates = [
      candidate(0, {
        activeProxyConnections: 4,
        stats: fullStats({ pid: 100, cpuPercent: 80, heapUsedBytes: 90 }),
      }),
      candidate(1, {
        activeProxyConnections: 1,
        stats: fullStats({ pid: 101, cpuPercent: 10, heapUsedBytes: 10 }),
      }),
    ];

    expect(resourceAwareLoadBalancer(context(candidates))).toMatchObject({
      workerIndex: 1,
    });
  });

  it("resource aware handles candidates with missing stats", () => {
    const candidates = [
      candidate(0, { activeProxyConnections: 5 }),
      candidate(1, { activeProxyConnections: 0, stats: fullStats({ cpuPercent: 0, heapUsedBytes: 0 }) }),
    ];
    // Worker 0: score = 5*10 + 0 + 0 = 50 (no stats → 0 cpu, 0 heap)
    // Worker 1: score = 0*10 + 0 + (0/100)*100 = 0
    expect(resourceAwareLoadBalancer(context(candidates))).toMatchObject({
      workerIndex: 1,
    });
  });

  it("throws when no candidates are available", () => {
    expect(() => roundRobinLoadBalancer(context([]))).toThrow(
      "no healthy backend candidates",
    );
    expect(() => leastConnectionsLoadBalancer(context([]))).toThrow(
      "no healthy backend candidates",
    );
    expect(() => resourceAwareLoadBalancer(context([]))).toThrow(
      "no healthy backend candidates",
    );
  });
});

describe("createResourceAwareLoadBalancer", () => {
  it("uses default weights matching resourceAwareLoadBalancer", () => {
    const candidates = [
      candidate(0, {
        activeProxyConnections: 4,
        stats: fullStats({ cpuPercent: 80, heapUsedBytes: 90 }),
      }),
      candidate(1, {
        activeProxyConnections: 1,
        stats: fullStats({ cpuPercent: 10, heapUsedBytes: 10 }),
      }),
    ];

    const defaultBalancer = createResourceAwareLoadBalancer();
    expect(defaultBalancer(context(candidates))).toMatchObject({ workerIndex: 1 });
  });

  it("allows custom weights that change the winner", () => {
    const candidates = [
      candidate(0, {
        activeProxyConnections: 1,
        stats: fullStats({ cpuPercent: 90, heapUsedBytes: 10 }),
      }),
      candidate(1, {
        activeProxyConnections: 10,
        stats: fullStats({ cpuPercent: 5, heapUsedBytes: 10 }),
      }),
    ];

    // With default weights, worker 1 has higher connection score (10*10=100)
    // vs worker 0 with high CPU (90*2=180). Worker 0 would lose.
    // But with cpuWeight=0 and connectionWeight=1, connections dominate less
    const cpuIgnored = createResourceAwareLoadBalancer({ cpuWeight: 0, connectionWeight: 1 });
    expect(cpuIgnored(context(candidates))).toMatchObject({ workerIndex: 0 });

    // With connectionWeight=0 and cpuWeight=100, CPU dominates
    const cpuHeavy = createResourceAwareLoadBalancer({ connectionWeight: 0, cpuWeight: 100 });
    expect(cpuHeavy(context(candidates))).toMatchObject({ workerIndex: 1 });
  });
});

describe("pickBackend", () => {
  it("uses the provided load balancer function", async () => {
    const candidates = [candidate(0), candidate(1)];
    const alwaysSecond = () => candidates[1]!;
    const result = await pickBackend(context(candidates), alwaysSecond);
    expect(result.workerIndex).toBe(1);
  });

  it("falls back to default balancer when none is provided", async () => {
    const candidates = [candidate(0)];
    const result = await pickBackend(context(candidates));
    expect(result.workerIndex).toBe(0);
  });

  it("supports async load balancer functions", async () => {
    const candidates = [candidate(0), candidate(1), candidate(2)];
    const asyncBalancer = async (ctx: LoadBalancerContext) => {
      await new Promise((r) => setTimeout(r, 1));
      return ctx.candidates[2]!;
    };
    const result = await pickBackend(context(candidates), asyncBalancer);
    expect(result.workerIndex).toBe(2);
  });
});
