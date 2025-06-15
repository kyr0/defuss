import { describe, it, expect, beforeAll } from "vitest";
import init from "../pkg/defuss_fastmath.js";
import { convolutionTestFunctions } from "./convolution-test-functions.js";

describe("Convolution Operations", () => {
  beforeAll(async () => {
    await init();
  });

  it("should perform 1D convolution correctly", () => {
    const result = convolutionTestFunctions.test1DConvolution();
    // Manual calculation:
    // result[0] = 1*0.5 = 0.5
    // result[1] = 1*1 + 2*0.5 = 2
    // result[2] = 1*0.5 + 2*1 + 3*0.5 = 4
    // result[3] = 2*0.5 + 3*1 + 4*0.5 = 6
    // result[4] = 3*0.5 + 4*1 = 5.5
    // result[5] = 4*0.5 = 2
    expect(Array.from(result)).toEqual([0.5, 2, 4, 6, 5.5, 2]);
  });

  it("should perform cross-correlation correctly", () => {
    const result = convolutionTestFunctions.testCrossCorrelation();
    // Manual calculation:
    // result[0] = 1*1 + 2*0 + 3*(-1) = 1 + 0 - 3 = -2
    // result[1] = 2*1 + 3*0 + 4*(-1) = 2 + 0 - 4 = -2
    // result[2] = 3*1 + 4*0 + 5*(-1) = 3 + 0 - 5 = -2
    expect(Array.from(result)).toEqual([-2, -2, -2]);
  });

  it("should perform 2D convolution correctly", () => {
    const result = convolutionTestFunctions.test2DConvolution();
    // Identity kernel should return the original image
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("should perform 2D convolution with edge detection kernel", () => {
    const result = convolutionTestFunctions.test2DEdgeDetection();
    // Center pixel should detect the edge (value difference)
    expect(result[4]).toBeGreaterThan(0); // Center should be positive (edge detected)
  });

  it("should perform auto-correlation correctly", () => {
    const result = convolutionTestFunctions.testAutoCorrelation();
    // Auto-correlation should be symmetric around zero lag
    expect(result[2]).toBeGreaterThan(result[1]); // Zero lag should be highest
    expect(result[2]).toBeGreaterThan(result[3]); // Zero lag should be highest
  });

  it("should handle impulse response convolution", () => {
    const result = convolutionTestFunctions.testImpulseResponse();
    // Impulse should return the kernel itself
    expect(Array.from(result)).toEqual([1, 2, 3, 0, 0, 0]);
  });

  it("should handle single-point convolution", () => {
    const result = convolutionTestFunctions.testSinglePointConvolution();
    expect(Array.from(result)).toEqual([10]);
  });
});
