import { describe, expect, it } from "vitest";

import {
  leastConnectionsLoadBalancer,
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

  it("resource aware uses connections and cpu pressure", () => {
    const candidates = [
      candidate(0, {
        activeProxyConnections: 4,
        stats: {
          pid: 100,
          cpuPercent: 80,
          rssBytes: 1,
          heapUsedBytes: 90,
          heapTotalBytes: 100,
          externalBytes: 0,
          arrayBuffersBytes: 0,
          uptimeMs: 1,
          activeConnections: 1,
          sampledAt: 1,
        },
      }),
      candidate(1, {
        activeProxyConnections: 1,
        stats: {
          pid: 101,
          cpuPercent: 10,
          rssBytes: 1,
          heapUsedBytes: 10,
          heapTotalBytes: 100,
          externalBytes: 0,
          arrayBuffersBytes: 0,
          uptimeMs: 1,
          activeConnections: 1,
          sampledAt: 1,
        },
      }),
    ];

    expect(resourceAwareLoadBalancer(context(candidates))).toMatchObject({
      workerIndex: 1,
    });
  });
});
