import { describe, it, expect, beforeAll } from "vitest";
import init from "../pkg";
import { convolutionTestFunctions } from "./convolution-test-functions.js";
import { createTestData } from "./test-util";

describe("Convolution Operations", () => {
  beforeAll(async () => {
    await init();
  });

  it("should perform 1D convolution correctly with small size", () => {
    const result = convolutionTestFunctions.test1DConvolution(4, 3);
    expect(result.signal).toHaveLength(4);
    expect(result.kernel).toHaveLength(3);
    expect(result.result).toHaveLength(6); // 4 + 3 - 1 = 6
  });

  it("should perform cross-correlation correctly", () => {
    const result = convolutionTestFunctions.testCrossCorrelation(5, 3);
    expect(result.signal).toHaveLength(5);
    expect(result.template).toHaveLength(3);
    expect(result.result).toHaveLength(3); // 5 - 3 + 1 = 3
  });

  it("should perform 2D convolution correctly", () => {
    const result = convolutionTestFunctions.test2DConvolution(3, 3);
    expect(result.image).toHaveLength(9); // 3x3 = 9
    expect(result.kernel).toHaveLength(9); // 3x3 = 9
    expect(result.result).toHaveLength(9); // 3x3 = 9
  });

  it("should perform 2D convolution with edge detection kernel", () => {
    const result = convolutionTestFunctions.testEdgeDetection(5);
    expect(result.image).toHaveLength(25); // 5x5 = 25
    expect(result.kernel).toHaveLength(9); // 3x3 edge detection kernel
    expect(result.result).toHaveLength(25); // 5x5 = 25
  });

  it("should perform auto-correlation correctly", () => {
    const result = convolutionTestFunctions.testAutoCorrelation(5, 2);
    expect(result.signal).toHaveLength(5);
    expect(result.result).toHaveLength(5); // 2 * 2 + 1 = 5
  });

  it("should handle impulse response convolution", () => {
    const result = convolutionTestFunctions.testImpulseResponse(4, 3);
    expect(result.signal).toHaveLength(4);
    expect(result.kernel).toHaveLength(3);
    expect(result.result).toHaveLength(6); // 4 + 3 - 1 = 6
    expect(result.signal[0]).toBe(1); // First element should be the impulse
  });

  it("should handle single-point convolution", () => {
    const result = convolutionTestFunctions.testSinglePoint();
    expect(Array.from(result.result)).toEqual([10]);
  });

  it("should work with different sizes", () => {
    // Test various sizes to ensure scalability
    const sizes = [4, 8, 16, 32];

    for (const size of sizes) {
      const kernelSize = Math.min(size, 5);
      const result = convolutionTestFunctions.test1DConvolution(
        size,
        kernelSize,
      );

      expect(result.signal).toHaveLength(size);
      expect(result.kernel).toHaveLength(kernelSize);
      expect(result.result).toHaveLength(size + kernelSize - 1);
    }
  });

  it("should produce reproducible results with same seeds", () => {
    const result1 = convolutionTestFunctions.test1DConvolution(8, 3);
    const result2 = convolutionTestFunctions.test1DConvolution(8, 3);

    // Results should be identical since we use seeded random generation
    expect(Array.from(result1.signal)).toEqual(Array.from(result2.signal));
    expect(Array.from(result1.kernel)).toEqual(Array.from(result2.kernel));
    expect(Array.from(result1.result)).toEqual(Array.from(result2.result));
  });

  it("should test data generation functions", () => {
    const signal = createTestData.signal(10, 42);
    const kernel = createTestData.kernel1D(5, 123);
    const image = createTestData.image2D(4, 84);

    expect(signal).toHaveLength(10);
    expect(kernel).toHaveLength(5);
    expect(image).toHaveLength(16); // 4x4 = 16

    // Check that values are in expected ranges
    expect(signal.every((v) => v >= -1 && v <= 1)).toBe(true);
    expect(image.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});
