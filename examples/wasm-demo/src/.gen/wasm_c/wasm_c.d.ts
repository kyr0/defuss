// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare namespace RuntimeExports {
    let HEAPF32: any;
}
interface WasmModule {
  _dot_product_serial_c_plain(_0: number, _1: number, _2: number, _3: number, _4: number): void;
  _dot_product_c(_0: number, _1: number, _2: number): number;
  _dot_product_serial_c(_0: number, _1: number, _2: number, _3: number, _4: number): void;
  _malloc(_0: number): number;
  _free(_0: number): void;
}

export type MainModule = WasmModule & typeof RuntimeExports;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
