# defuss-open-telemetry architecture

## Purpose

This package adapts defuss-style metrics sinks to an OpenTelemetry-like meter surface without forcing the orchestrator core to import OTel directly.

The point is to keep the core package small and dependency-light while still allowing first-class metrics export when a deployment wants it.

## Design

The bridge consumes a `MeterLike` object. That object may be:

- an `OtelMeterAdapter`-wrapped real OTel meter
- an `InMemoryMeter` (for tests)
- any duck-typed implementation

Required meter features are intentionally tiny:

- create counter
- create histogram
- create observable gauge

That is enough for the orchestrator metrics surface.

## Why not import `@opentelemetry/*` directly here?

Because the monorepo package should stay flexible:

- transports/exporters will evolve
- some deployments want a very small footprint
- testability is better with duck-typed adapters

All OTel types are duck-typed (`OtelMeterLike`, `ObservableLike`, etc.) — the package has **zero runtime dependencies** on the OTel SDK.

## OtelMeterAdapter — bridging the OTel 1.x gauge incompatibility

Our internal `MeterLike.createObservableGauge(name, opts, callback)` accepts the callback inline. The real `@opentelemetry/api` 1.x `Meter.createObservableGauge(name, opts)` does **not** — it returns an `Observable` with `addCallback(cb)` / `removeCallback(cb)` methods.

`OtelMeterAdapter` resolves this transparently:

```ts
createObservableGauge(name, opts, callback):
  observable = realMeter.createObservableGauge(name, opts)
  observable.addCallback(callback)        // bridge the callback
  return observable
```

Because the OTel `ObservableResult.observe(value, attrs)` signature is structurally identical to our `ObservableResultLike`, the real result object is passed straight through — no wrapping needed.

## Attributes

Our `Attributes` type allows `string | number | boolean | undefined`.

The official OTel `Attributes` also allows array values (`string[]`, `number[]`, `boolean[]`). We intentionally omit those for simplicity — the orchestrator metrics surface never needs array-valued attributes.

## Metrics strategy

The bridge lazily creates instruments per metric name and caches them.

Why:

- avoids repeated instrument creation on the hot path
- keeps call sites simple
- preserves KISS behavior

## Gauges

Observable gauges need callbacks. The bridge maintains a last-value table and exposes one callback per gauge that observes the latest written value.

This means:

- `setGauge()` is immediate from the caller’s point of view
- the underlying meter observes the most recent value during collection

## Exports

| Export                       | Purpose                                              |
|------------------------------|------------------------------------------------------|
| `createOpenTelemetrySink`    | Factory — returns a `TelemetrySink` from a `MeterLike` |
| `OtelMeterAdapter`           | Wraps a real OTel `Meter` into `MeterLike`           |
| `InMemoryMeter`              | Test double implementing `MeterLike`                 |
| `noopTelemetrySink`          | Zero-cost no-op `TelemetrySink`                      |

## Scope

This package is intentionally small. It is not trying to be a full telemetry SDK. It is just the narrow bridge needed by defuss packages.
