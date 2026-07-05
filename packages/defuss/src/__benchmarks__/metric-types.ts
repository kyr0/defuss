/** Shared metric types for benchmark results */

export interface BenchMetric {
    name: string;
    iterations: number;
    min: number;
    mean: number;
    max: number;
    hz: number;
    times: number[];
}
