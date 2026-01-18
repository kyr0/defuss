import init, { initThreadPool } from "../pkg/defuss_search.js";

// Global WASM instance state
let wasmInitialized = false;
let wasmInstance: any;

export interface ChunkedResult {
  results: Float32Array;
  totalTime: number;
  executionTime: number;
  chunksProcessed?: number;
}

export interface DotProductResult extends ChunkedResult {
  gflops: number;
  memoryEfficiency: number;
  processingMethod: "direct" | "chunked";
}

// =============================================================================
// HYBRID SEARCH ENGINE INTERFACES
// =============================================================================

export interface SearchResult {
  id: string;
  score: number;
}

export interface HybridSearchOptions {
  /** Text query for lexical search */
  text?: string;
  /** Vector query for semantic search */
  vector?: Float32Array;
  /** Number of results to return */
  topK?: number;
  /** Fusion strategy: "rrf" or "combsum" */
  strategy?: "rrf" | "combsum";
  /** Alpha parameter for CombSUM fusion (0.0 = text only, 1.0 = vector only) */
  alpha?: number;
}

export interface DocumentField {
  name: string;
  value: string | string[];
  kind?: "text" | "keyword" | "tag";
}

export interface DocumentInput {
  id: string;
  fields: DocumentField[];
  vector?: Float32Array;
}

export interface SchemaField {
  name: string;
  kind: "text" | "keyword" | "tag";
  semantic?:
  | "title"
  | "heading"
  | "description"
  | "body"
  | "tags"
  | "author"
  | "date"
  | "reference";
  weight?: number;
  b?: number;
}

export interface SearchEngineSchema {
  fields: SchemaField[];
  language?:
  | "english"
  | "spanish"
  | "french"
  | "german"
  | "italian"
  | "portuguese"
  | "russian"
  | "arabic"
  | "chinese"
  | "japanese"
  | "korean"
  | "dutch"
  | "swedish"
  | "norwegian"
  | "turkish";
  tokenizerConfig?: {
    minLength?: number;
    maxLength?: number;
    includeMixed?: boolean;
  };
}

// Search engine will be implemented in future iterations
// For now, we export the existing high-performance vector operations

export interface InitWasmOptions {
  /** Skip thread pool initialization (useful for tests or single-threaded use) */
  skipThreadPool?: boolean;
  /** Number of threads to use (defaults to navigator.hardwareConcurrency or 8) */
  numThreads?: number;
}

/**
 * Initialize WASM module for ultimate performance operations
 * Must be called before using any ultimate performance functions
 */
export async function initWasm(options?: InitWasmOptions): Promise<any> {
  if (!wasmInitialized) {
    try {
      console.log("🔧 Loading WASM module...");
      wasmInstance = await init();
      console.log("✅ WASM module loaded");

      // Skip thread pool in test environments or when explicitly requested
      const skipThreadPool = options?.skipThreadPool ??
        (typeof process !== 'undefined' && process.env?.VITEST === 'true');

      if (!skipThreadPool) {
        const numThreads = options?.numThreads ?? (navigator.hardwareConcurrency || 8);
        await initThreadPool(numThreads);
        console.log("✅ Thread pool initialized successfully");
      } else {
        console.log("ℹ️ Thread pool initialization skipped");
      }

      wasmInitialized = true;
      console.log("✅ WASM initialization complete");
    } catch (error) {
      console.error("❌ WASM initialization failed:", error);
      throw new Error(
        `WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return wasmInstance;
}

/**
 * Get the WASM module exports for direct access to classes
 */
export function getWasmModule() {
  if (!wasmInstance) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }
  return wasmInstance;
}

/**
 * Get memory usage information from WASM
 */
export function getWasmMemoryInfo(): { usedMB: number; totalMB: number } {
  if (!wasmInstance) {
    return { usedMB: 0, totalMB: 0 };
  }

  const totalBytes = wasmInstance.memory.buffer.byteLength;
  const totalMB = totalBytes / (1024 * 1024);

  return {
    usedMB: totalMB, // For WASM, allocated = used
    totalMB,
  };
}

export * from "../pkg/defuss_search.js";
