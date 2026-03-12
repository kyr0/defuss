import type {
  Attributes,
  CounterLike,
  HistogramLike,
  MeterLike,
  MetricOptions,
  ObservableLike,
  ObservableResultLike,
  OtelMeterLike,
  TelemetrySink,
} from "./types.js";

export * from "./types.js";

// ---------------------------------------------------------------------------
// createOpenTelemetrySink
// ---------------------------------------------------------------------------

/** Configuration for {@link createOpenTelemetrySink}. */
export interface CreateOpenTelemetrySinkConfig {
  /**
   * A {@link MeterLike} instance — either an {@link InMemoryMeter}, an
   * {@link OtelMeterAdapter}-wrapped real OTel meter, or any duck-typed
   * implementation.
   */
  meter: MeterLike;
  /**
   * Optional string prepended to every metric name.
   * Example: `"defuss.orchestrator."`.
   */
  prefix?: string;
  /**
   * Optional map from bare metric name → human-readable description.
   * Passed as `description` when instruments are lazily created.
   */
  descriptions?: Record<string, string>;
}

interface GaugeState {
  value: number;
  attributes?: Attributes;
}

/**
 * Create a {@link TelemetrySink} backed by a {@link MeterLike}.
 *
 * Instruments are created lazily on first use and cached for the lifetime
 * of the sink. The optional {@link CreateOpenTelemetrySinkConfig.prefix} is
 * prepended to every metric name so you can namespace metrics without
 * changing call-sites.
 */
export function createOpenTelemetrySink(
  config: CreateOpenTelemetrySinkConfig,
): TelemetrySink {
  const counterCache = new Map<string, CounterLike>();
  const histogramCache = new Map<string, HistogramLike>();
  const gaugeState = new Map<string, GaugeState>();
  const gaugeRegistered = new Set<string>();
  const prefix = config.prefix ?? "";

  function metricName(name: string): string {
    return `${prefix}${name}`;
  }

  function getDescription(name: string): string | undefined {
    return config.descriptions?.[name];
  }

  function ensureCounter(name: string): CounterLike {
    const key = metricName(name);
    let counter = counterCache.get(key);
    if (!counter) {
      counter = config.meter.createCounter(key, { description: getDescription(name) });
      counterCache.set(key, counter);
    }
    return counter;
  }

  function ensureHistogram(name: string): HistogramLike {
    const key = metricName(name);
    let histogram = histogramCache.get(key);
    if (!histogram) {
      histogram = config.meter.createHistogram(key, { description: getDescription(name) });
      histogramCache.set(key, histogram);
    }
    return histogram;
  }

  function ensureGauge(name: string): void {
    const key = metricName(name);
    if (gaugeRegistered.has(key)) return;
    gaugeRegistered.add(key);
    config.meter.createObservableGauge(
      key,
      { description: getDescription(name) },
      (observableResult: ObservableResultLike) => {
        const state = gaugeState.get(key);
        if (!state) return;
        observableResult.observe(state.value, state.attributes);
      },
    );
  }

  return {
    incrementCounter(name: string, value = 1, attributes?: Attributes): void {
      ensureCounter(name).add(value, attributes);
    },
    recordHistogram(name: string, value: number, attributes?: Attributes): void {
      ensureHistogram(name).record(value, attributes);
    },
    setGauge(name: string, value: number, attributes?: Attributes): void {
      const key = metricName(name);
      ensureGauge(name);
      gaugeState.set(key, { value, attributes });
    },
  };
}

// ---------------------------------------------------------------------------
// noopTelemetrySink
// ---------------------------------------------------------------------------

/**
 * A {@link TelemetrySink} that silently discards all metrics.
 *
 * Useful as the default sink when no telemetry backend is configured,
 * avoiding `if (sink)` guards at every call-site.
 */
export const noopTelemetrySink: TelemetrySink = {
  incrementCounter() {},
  recordHistogram() {},
  setGauge() {},
};

// ---------------------------------------------------------------------------
// InMemoryMeter
// ---------------------------------------------------------------------------

/**
 * Simple in-memory {@link MeterLike} for testing purposes.
 *
 * Instruments accumulate raw observations that can be inspected directly
 * via {@link counters}, {@link histograms}, and {@link gauges}.
 * Call {@link collect} to trigger all registered gauge callbacks.
 */
export class InMemoryMeter implements MeterLike {
  /** Accumulated counter `add()` calls keyed by metric name. */
  readonly counters = new Map<string, Array<{ value: number; attributes?: Attributes }>>();
  /** Accumulated histogram `record()` calls keyed by metric name. */
  readonly histograms = new Map<string, Array<{ value: number; attributes?: Attributes }>>();
  /** Registered gauge callbacks and their collected observations. */
  readonly gauges = new Map<string, { callback: (result: ObservableResultLike) => void; observations: Array<{ value: number; attributes?: Attributes }> }>();

  /** Create a counter that appends every `add()` call to {@link counters}. */
  createCounter(name: string): CounterLike {
    return {
      add: (value: number, attributes?: Attributes) => {
        const existing = this.counters.get(name) ?? [];
        existing.push({ value, attributes });
        this.counters.set(name, existing);
      },
    };
  }

  /** Create a histogram that appends every `record()` call to {@link histograms}. */
  createHistogram(name: string): HistogramLike {
    return {
      record: (value: number, attributes?: Attributes) => {
        const existing = this.histograms.get(name) ?? [];
        existing.push({ value, attributes });
        this.histograms.set(name, existing);
      },
    };
  }

  /** Register an observable gauge callback. Observations are collected on {@link collect}. */
  createObservableGauge(
    name: string,
    _options: MetricOptions,
    callback: (observableResult: ObservableResultLike) => void,
  ): unknown {
    this.gauges.set(name, { callback, observations: [] });
    return {};
  }

  /**
   * Trigger all registered gauge callbacks, appending their observations.
   * Call this to simulate a metrics collection cycle in tests.
   */
  collect(): void {
    for (const gauge of this.gauges.values()) {
      gauge.callback({
        observe: (value: number, attributes?: Attributes) => {
          gauge.observations.push({ value, attributes });
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// OtelMeterAdapter
// ---------------------------------------------------------------------------

/**
 * Adapter that wraps a real `@opentelemetry/api` 1.x `Meter`
 * (typed as {@link OtelMeterLike}) into the {@link MeterLike}
 * interface expected by {@link createOpenTelemetrySink}.
 *
 * The key incompatibility this adapter solves:
 *
 * - **Our `MeterLike.createObservableGauge(name, opts, callback)`** accepts
 *   the callback *inline*.
 * - **The real OTel 1.x `Meter.createObservableGauge(name, opts)`** returns
 *   an `Observable` with an `addCallback(cb)` method — no inline callback.
 *
 * The adapter bridges this by calling `addCallback` on the returned
 * `Observable`, passing the caller-supplied callback through. Because the
 * real `ObservableResult.observe(value, attrs)` is structurally identical
 * to our `ObservableResultLike`, no further translation is needed.
 *
 * @example
 * ```ts
 * import { metrics } from "@opentelemetry/api";
 * import { createOpenTelemetrySink, OtelMeterAdapter } from "defuss-open-telemetry";
 *
 * const realMeter = metrics.getMeter("my-service");
 * const sink = createOpenTelemetrySink({
 *   meter: new OtelMeterAdapter(realMeter),
 *   prefix: "defuss.orchestrator.",
 * });
 * ```
 */
export class OtelMeterAdapter implements MeterLike {
  constructor(private readonly meter: OtelMeterLike) {}

  createCounter(name: string, options?: MetricOptions): CounterLike {
    return this.meter.createCounter(name, options);
  }

  createHistogram(name: string, options?: MetricOptions): HistogramLike {
    return this.meter.createHistogram(name, options);
  }

  createObservableGauge(
    name: string,
    options: MetricOptions,
    callback: (observableResult: ObservableResultLike) => void,
  ): ObservableLike {
    const observable = this.meter.createObservableGauge(name, options);
    observable.addCallback(callback);
    return observable;
  }
}
