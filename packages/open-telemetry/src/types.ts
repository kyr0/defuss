/**
 * Key/value bag for metric dimensions (labels).
 *
 * Intentionally limited to scalar primitives for simplicity.
 * The official OTel `Attributes` type also allows array values
 * (`string[]`, `number[]`, `boolean[]`) — we omit those to keep
 * the surface tiny. Consumers that need array attributes should
 * use the full `@opentelemetry/api` type at their own call-sites.
 */
export interface Attributes {
  [key: string]: string | number | boolean | undefined;
}

/** Options accepted when creating a metric instrument. */
export interface MetricOptions {
  /** Human readable description of the metric. */
  description?: string;
}

/**
 * Minimal counter instrument.
 *
 * Mirrors the OTel `Counter` interface — only the `add` method is required.
 * The official API also accepts an optional `context` parameter which we omit
 * (structurally compatible — extra args are simply ignored).
 */
export interface CounterLike {
  /** Increment the counter by {@link value} (must be non-negative). */
  add(value: number, attributes?: Attributes): void;
}

/**
 * Minimal histogram instrument.
 *
 * Mirrors the OTel `Histogram` interface — only `record` is required.
 */
export interface HistogramLike {
  /** Record a single measurement. */
  record(value: number, attributes?: Attributes): void;
}

/**
 * Result object passed into observable gauge callbacks.
 *
 * Structurally identical to the OTel `ObservableResult` interface.
 */
export interface ObservableResultLike {
  /** Report the current value for this observation. */
  observe(value: number, attributes?: Attributes): void;
}

/**
 * Internal meter contract used by {@link createOpenTelemetrySink}.
 *
 * This is the "defuss-style" meter that accepts a callback directly in
 * `createObservableGauge`. {@link InMemoryMeter} implements this interface.
 *
 * If you need to pass a *real* `@opentelemetry/api` `Meter`, wrap it with
 * {@link OtelMeterAdapter} first — the real API does **not** accept the
 * callback parameter inline and instead uses `Observable.addCallback()`.
 */
export interface MeterLike {
  /** Create (or retrieve) a monotonic counter instrument. */
  createCounter(name: string, options?: MetricOptions): CounterLike;
  /** Create (or retrieve) a histogram instrument. */
  createHistogram(name: string, options?: MetricOptions): HistogramLike;
  /**
   * Create an observable gauge and register a {@link callback} that will be
   * invoked on every metrics collection cycle.
   */
  createObservableGauge(
    name: string,
    options: MetricOptions,
    callback: (observableResult: ObservableResultLike) => void,
  ): unknown;
}

// ---------------------------------------------------------------------------
// OTel 1.x duck-typed interfaces
// ---------------------------------------------------------------------------

/**
 * Mirrors the OTel 1.x `Observable` type returned by
 * `Meter.createObservableGauge()`.
 *
 * The real SDK lets you register per-instrument callbacks via `addCallback`;
 * the callback receives an `ObservableResult` whose `observe()` signature
 * matches our {@link ObservableResultLike}.
 */
export interface ObservableLike {
  /** Register a callback invoked on every collection cycle. */
  addCallback(callback: (result: ObservableResultLike) => void): void;
  /** Remove a previously registered callback. */
  removeCallback(callback: (result: ObservableResultLike) => void): void;
}

/**
 * Duck-typed subset of the official `@opentelemetry/api` 1.x `Meter`.
 *
 * Key difference from {@link MeterLike}: `createObservableGauge` does **not**
 * accept a callback parameter — instead it returns an {@link ObservableLike}
 * on which you call `addCallback()`.
 *
 * Pass an instance of this to {@link OtelMeterAdapter} to get a
 * {@link MeterLike} that works with {@link createOpenTelemetrySink}.
 */
export interface OtelMeterLike {
  /** Create a monotonic counter. */
  createCounter(name: string, options?: MetricOptions): CounterLike;
  /** Create a histogram. */
  createHistogram(name: string, options?: MetricOptions): HistogramLike;
  /** Create an observable gauge (no inline callback — use `addCallback`). */
  createObservableGauge(name: string, options?: MetricOptions): ObservableLike;
}

/**
 * High-level metrics facade consumed by the orchestrator and other
 * defuss packages.
 *
 * Callers never deal with instrument creation — they simply call
 * `incrementCounter`, `recordHistogram`, or `setGauge` with a name.
 */
export interface TelemetrySink {
  /** Increment a named counter (default increment is 1). */
  incrementCounter(name: string, value?: number, attributes?: Attributes): void;
  /** Record a single histogram measurement. */
  recordHistogram(name: string, value: number, attributes?: Attributes): void;
  /** Set the current value of a named gauge. */
  setGauge(name: string, value: number, attributes?: Attributes): void;
}
