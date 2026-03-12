import { describe, it, expect } from "vitest";
import {
  createOpenTelemetrySink,
  InMemoryMeter,
  noopTelemetrySink,
  OtelMeterAdapter,
} from "./index.js";
import type {
  Attributes,
  ObservableLike,
  ObservableResultLike,
  OtelMeterLike,
} from "./types.js";

// ---------------------------------------------------------------------------
// InMemoryMeter
// ---------------------------------------------------------------------------

describe("InMemoryMeter", () => {
  it("accumulates counter values", () => {
    const meter = new InMemoryMeter();
    const counter = meter.createCounter("req");
    counter.add(1);
    counter.add(5, { method: "GET" });

    expect(meter.counters.get("req")).toEqual([
      { value: 1, attributes: undefined },
      { value: 5, attributes: { method: "GET" } },
    ]);
  });

  it("accumulates histogram values", () => {
    const meter = new InMemoryMeter();
    const hist = meter.createHistogram("latency");
    hist.record(42);
    hist.record(7, { route: "/api" });

    expect(meter.histograms.get("latency")).toEqual([
      { value: 42, attributes: undefined },
      { value: 7, attributes: { route: "/api" } },
    ]);
  });

  it("collect() drives gauge callbacks and stores observations", () => {
    const meter = new InMemoryMeter();
    let current = 10;
    meter.createObservableGauge("mem", {}, (result) => {
      result.observe(current);
    });

    meter.collect();
    const gauge = meter.gauges.get("mem");
    expect(gauge).toBeDefined();
    expect(gauge?.observations).toEqual([
      { value: 10, attributes: undefined },
    ]);

    current = 20;
    meter.collect();
    expect(gauge?.observations).toEqual([
      { value: 10, attributes: undefined },
      { value: 20, attributes: undefined },
    ]);
  });
});

// ---------------------------------------------------------------------------
// createOpenTelemetrySink
// ---------------------------------------------------------------------------

describe("createOpenTelemetrySink", () => {
  it("increments a counter", () => {
    const meter = new InMemoryMeter();
    const sink = createOpenTelemetrySink({ meter });

    sink.incrementCounter("hits");
    sink.incrementCounter("hits", 3, { code: 200 });

    expect(meter.counters.get("hits")).toEqual([
      { value: 1, attributes: undefined },
      { value: 3, attributes: { code: 200 } },
    ]);
  });

  it("records a histogram", () => {
    const meter = new InMemoryMeter();
    const sink = createOpenTelemetrySink({ meter });

    sink.recordHistogram("dur", 123);
    expect(meter.histograms.get("dur")).toEqual([
      { value: 123, attributes: undefined },
    ]);
  });

  it("sets a gauge observable via last-value semantics", () => {
    const meter = new InMemoryMeter();
    const sink = createOpenTelemetrySink({ meter });

    sink.setGauge("queue", 5);
    sink.setGauge("queue", 8, { worker: "a" });

    meter.collect();
    const gauge = meter.gauges.get("queue");
    expect(gauge).toBeDefined();
    // Only the latest value (8) should be observed
    expect(gauge?.observations).toEqual([
      { value: 8, attributes: { worker: "a" } },
    ]);
  });

  it("applies prefix to all metric names", () => {
    const meter = new InMemoryMeter();
    const sink = createOpenTelemetrySink({
      meter,
      prefix: "defuss.",
    });

    sink.incrementCounter("x");
    sink.recordHistogram("y", 1);
    sink.setGauge("z", 2);

    expect(meter.counters.has("defuss.x")).toBe(true);
    expect(meter.histograms.has("defuss.y")).toBe(true);
    expect(meter.gauges.has("defuss.z")).toBe(true);
  });

  it("caches instruments — repeated calls reuse the same counter", () => {
    const meter = new InMemoryMeter();
    const sink = createOpenTelemetrySink({ meter });

    sink.incrementCounter("c", 1);
    sink.incrementCounter("c", 2);

    // There should be one counter entry (same key), with two recorded adds
    const entries = meter.counters.get("c");
    expect(entries).toBeDefined();
    expect(entries?.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// noopTelemetrySink
// ---------------------------------------------------------------------------

describe("noopTelemetrySink", () => {
  it("does not throw on any method call", () => {
    expect(() => noopTelemetrySink.incrementCounter("a")).not.toThrow();
    expect(() => noopTelemetrySink.recordHistogram("b", 1)).not.toThrow();
    expect(() => noopTelemetrySink.setGauge("c", 2)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// OtelMeterAdapter
// ---------------------------------------------------------------------------

describe("OtelMeterAdapter", () => {
  /** Minimal mock implementing OtelMeterLike. */
  function createMockOtelMeter(): OtelMeterLike & {
    registeredCallbacks: Map<string, Array<(r: ObservableResultLike) => void>>;
  } {
    const registeredCallbacks = new Map<
      string,
      Array<(r: ObservableResultLike) => void>
    >();

    return {
      registeredCallbacks,

      createCounter(_name: string) {
        return { add(_v: number, _a?: Attributes) {} };
      },

      createHistogram(_name: string) {
        return { record(_v: number, _a?: Attributes) {} };
      },

      createObservableGauge(name: string): ObservableLike {
        const cbs: Array<(r: ObservableResultLike) => void> = [];
        registeredCallbacks.set(name, cbs);
        return {
          addCallback(cb: (r: ObservableResultLike) => void) {
            cbs.push(cb);
          },
          removeCallback(cb: (r: ObservableResultLike) => void) {
            const idx = cbs.indexOf(cb);
            if (idx >= 0) cbs.splice(idx, 1);
          },
        };
      },
    };
  }

  it("delegates createCounter to the underlying meter", () => {
    const mock = createMockOtelMeter();
    const adapter = new OtelMeterAdapter(mock);
    const counter = adapter.createCounter("x");
    // Should not throw — verifies delegation
    expect(() => counter.add(1)).not.toThrow();
  });

  it("delegates createHistogram to the underlying meter", () => {
    const mock = createMockOtelMeter();
    const adapter = new OtelMeterAdapter(mock);
    const hist = adapter.createHistogram("y");
    expect(() => hist.record(42)).not.toThrow();
  });

  it("bridges createObservableGauge by calling addCallback on the Observable", () => {
    const mock = createMockOtelMeter();
    const adapter = new OtelMeterAdapter(mock);

    const observations: Array<{ value: number; attributes?: Attributes }> = [];

    adapter.createObservableGauge("g", {}, (result) => {
      result.observe(99, { region: "us" });
    });

    // The adapter should have registered a callback on the mock observable
    const cbs = mock.registeredCallbacks.get("g");
    expect(cbs).toBeDefined();
    expect(cbs?.length).toBe(1);

    // Simulate a collection cycle: invoke the registered callback
    const cb = cbs?.[0];
    expect(cb).toBeDefined();
    cb?.({
      observe(value: number, attributes?: Attributes) {
        observations.push({ value, attributes });
      },
    });

    expect(observations).toEqual([{ value: 99, attributes: { region: "us" } }]);
  });

  it("works end-to-end with createOpenTelemetrySink", () => {
    const mock = createMockOtelMeter();
    const adapter = new OtelMeterAdapter(mock);
    const sink = createOpenTelemetrySink({ meter: adapter });

    sink.setGauge("active", 7, { host: "a" });

    // Simulate OTel collection cycle
    const cbs = mock.registeredCallbacks.get("active");
    expect(cbs).toBeDefined();
    expect(cbs?.length).toBe(1);

    const observations: Array<{ value: number; attributes?: Attributes }> = [];
    const cb = cbs?.[0];
    expect(cb).toBeDefined();
    cb?.({
      observe(value: number, attributes?: Attributes) {
        observations.push({ value, attributes });
      },
    });

    expect(observations).toEqual([{ value: 7, attributes: { host: "a" } }]);
  });
});
