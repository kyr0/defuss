# `defuss-open-telemetry`

Tiny bridge from defuss-style metrics into OpenTelemetry-compatible meters.

Zero runtime dependencies on the OTel SDK - all interfaces are duck-typed. You hand it a meter-like object, and it returns a sink with `incrementCounter`, `recordHistogram`, and `setGauge`.

## With a real OpenTelemetry Meter

```ts
import { metrics } from "@opentelemetry/api";
import { createOpenTelemetrySink, OtelMeterAdapter } from "defuss-open-telemetry";

const realMeter = metrics.getMeter("my-service");
const sink = createOpenTelemetrySink({
  meter: new OtelMeterAdapter(realMeter),
  prefix: "defuss.orchestrator.",
});

sink.incrementCounter("requests");
sink.recordHistogram("latency_ms", 42);
sink.setGauge("queue_depth", 7);
```

`OtelMeterAdapter` bridges the OTel 1.x gauge API difference (see `ARCH.md`).

## Without OTel (no-op)

```ts
import { noopTelemetrySink } from "defuss-open-telemetry";

// All calls are silently discarded
noopTelemetrySink.incrementCounter("x");
```

## For testing

```ts
import { createOpenTelemetrySink, InMemoryMeter } from "defuss-open-telemetry";

const meter = new InMemoryMeter();
const sink = createOpenTelemetrySink({ meter });

sink.incrementCounter("hits", 3);
console.log(meter.counters.get("hits")); // [{ value: 3, attributes: undefined }]

sink.setGauge("active", 5);
meter.collect(); // triggers gauge callbacks
console.log(meter.gauges.get("active")!.observations); // [{ value: 5, ... }]
```

## API surface

| Export                    | Purpose                                              |
|---------------------------|------------------------------------------------------|
| `createOpenTelemetrySink` | Factory - returns a `TelemetrySink` from a `MeterLike` |
| `OtelMeterAdapter`        | Wraps a real OTel 1.x `Meter` into `MeterLike`      |
| `InMemoryMeter`           | Test double implementing `MeterLike`                 |
| `noopTelemetrySink`       | Zero-cost no-op `TelemetrySink`                      |

See `ARCH.md` for design rationale.
