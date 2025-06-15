/**
 * @fileoverview TypeScript declarations for WebNN API
 * These types are not yet in the standard lib but are needed for WebNN development
 */

declare global {
  interface Navigator {
    ml?: {
      createContext(options?: MLContextOptions): Promise<MLContext>;
    };
  }

  interface MLContextOptions {
    deviceType?: "cpu" | "gpu" | "npu";
    powerPreference?: "default" | "high-performance" | "low-power";
  }

  interface MLContext {
    // Context methods would be defined here
  }

  interface MLGraph {
    compute(
      inputs: Record<string, ArrayBufferView>,
      outputs: Record<string, ArrayBufferView>,
    ): Promise<void>;
  }

  interface MLGraphBuilder {
    input(name: string, desc: MLOperandDescriptor): MLOperand;
    constant(desc: MLOperandDescriptor, data: ArrayBufferView): MLOperand;
    conv2d(
      input: MLOperand,
      filter: MLOperand,
      options?: MLConv2dOptions,
    ): MLOperand;
    build(outputs: Record<string, MLOperand>): Promise<MLGraph>;
  }

  interface MLOperand {
    // Operand interface
  }

  interface MLOperandDescriptor {
    type: "float32" | "float16" | "int32" | "uint32" | "int8" | "uint8";
    dimensions: number[];
  }

  interface MLConv2dOptions {
    padding?: number[];
    strides?: number[];
    dilations?: number[];
    groups?: number;
    inputLayout?: "nchw" | "nhwc";
    filterLayout?: "oihw" | "hwio" | "ohwi" | "ihwo";
    autoPad?: "explicit" | "same-upper" | "same-lower" | "valid";
    activation?: MLActivation;
  }

  interface MLActivation {
    // Activation interface
  }

  // Global constructor
  var MLGraphBuilder: {
    new (context: MLContext): MLGraphBuilder;
  };
}

export {};
