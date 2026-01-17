// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
  _dot_product_c(_0: number, _1: number, _2: number): number;
  _malloc(_0: number): number;
  _free(_0: number): void;
}

export type MainModule = WasmModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
