import init, {
  initThreadPool,
  batch_dot_product_ultimate_external,
  WasmSearchEngine,
  WasmDocument,
  WasmSearchResult,
} from "../pkg/defuss_search.js";

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

/**
 * Initialize WASM module for ultimate performance operations
 * Must be called before using any ultimate performance functions
 */
export async function initWasm(): Promise<any> {
  if (!wasmInitialized) {
    try {
      console.log("🔧 Loading WASM module...");
      wasmInstance = await init();
      console.log("✅ WASM module loaded");
      
      // Skip thread pool initialization for now - it's causing hangs in test environment
      console.log("⚠️ Skipping thread pool initialization (not needed for basic functionality)");
      
      wasmInitialized = true;
      console.log("✅ WASM initialization complete");
    } catch (error) {
      console.error("❌ WASM initialization failed:", error);
      throw new Error(`WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return wasmInstance;
}

/**
 * Get the WASM module exports for direct access to classes
 */
function getWasmModule() {
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

/**
 * Native JavaScript dot product for verification purposes
 */
function nativeDotProduct(a: Float32Array, b: Float32Array): number {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i];
  }
  return result;
}

/**
 * Memory-aware configuration for intelligent workload management
 */
const MEMORY_CONFIG = {
  MAX_SAFE_ELEMENTS: 8_000_000, // 32MB for a+b data (conservative WASM limit)
  OPTIMAL_CHUNK_ELEMENTS: 2_000_000, // 8MB optimal chunk size
  MIN_CHUNK_PAIRS: 100, // Don't split below this threshold
} as const;

/**
 * Check if workload can fit in memory without splitting
 */
function canFitInMemory(vectorLength: number, numPairs: number): boolean {
  const totalElements = vectorLength * numPairs * 2; // Both a and b vectors
  return totalElements <= MEMORY_CONFIG.MAX_SAFE_ELEMENTS;
}

/**
 * Calculate optimal chunk size for large workloads
 */
function calculateOptimalChunkSize(
  vectorLength: number,
  numPairs: number,
): number {
  const elementsPerPair = vectorLength * 2;
  const maxPairsPerChunk = Math.floor(
    MEMORY_CONFIG.OPTIMAL_CHUNK_ELEMENTS / elementsPerPair,
  );
  return Math.max(
    MEMORY_CONFIG.MIN_CHUNK_PAIRS,
    Math.min(numPairs, maxPairsPerChunk),
  );
}

/**
 * Intelligent workload splitting with zero-copy chunk processing
 */
async function processWorkloadInChunks(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  processingFunction: (
    a: Float32Array,
    b: Float32Array,
    vlen: number,
    npairs: number,
  ) => any,
): Promise<ChunkedResult> {
  const chunkSize = calculateOptimalChunkSize(vectorLength, numPairs);
  const allResults = new Float32Array(numPairs);
  let totalTime = 0;
  let totalExecutionTime = 0;
  let chunksProcessed = 0;

  //console.log(`📊 Splitting workload: ${numPairs} pairs → ${Math.ceil(numPairs / chunkSize)} chunks of ≤${chunkSize} pairs`);

  for (let startPair = 0; startPair < numPairs; startPair += chunkSize) {
    const currentChunkSize = Math.min(chunkSize, numPairs - startPair);
    const startIdx = startPair * vectorLength;
    const endIdx = startIdx + currentChunkSize * vectorLength;

    // Zero-copy chunk extraction using subarray
    const chunkA = vectorsA.subarray(startIdx, endIdx);
    const chunkB = vectorsB.subarray(startIdx, endIdx);

    //console.log(`🔄 Processing chunk ${chunksProcessed + 1}: pairs ${startPair}-${startPair + currentChunkSize - 1}`);

    // Process chunk
    const chunkResult = processingFunction(
      chunkA,
      chunkB,
      vectorLength,
      currentChunkSize,
    );

    // Extract timing and results
    if (chunkResult.length >= 2 + currentChunkSize) {
      totalTime += chunkResult[0] as number;
      totalExecutionTime += chunkResult[1] as number;

      // Copy results to main array
      for (let i = 0; i < currentChunkSize; i++) {
        allResults[startPair + i] = chunkResult[2 + i] as number;
      }
    } else {
      throw new Error(
        `Chunk processing failed: expected ${2 + currentChunkSize} results, got ${chunkResult.length}`,
      );
    }

    chunksProcessed++;

    // Small delay to prevent blocking the event loop for very large workloads
    if (chunksProcessed % 10 === 0) {
      //await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    results: allResults,
    totalTime,
    executionTime: totalExecutionTime,
    chunksProcessed,
  };
}

/**
 * Process batch dot product with automatic method selection (direct vs chunked)
 * If vectorLength is not provided, structure will be inferred automatically
 * If numPairs is not provided, it will be calculated from the array length and vectorLength
 */
export async function dotProductFlat(
  vectorsAConcatenated: Float32Array,
  vectorsBConcatenated: Float32Array,
  vectorLength: number,
  numPairs: number,
): Promise<DotProductResult> {
  if (!wasmInstance) {
    throw new Error("WASM not initialized");
  }

  console.log(
    `🎯 Processing batch dot product: vectorLength=${vectorLength}, numPairs=${numPairs}`,
  );

  // Validate input arrays
  const totalElements = vectorLength * numPairs;
  if (
    vectorsAConcatenated.length !== totalElements ||
    vectorsBConcatenated.length !== totalElements
  ) {
    throw new Error(
      `Input array size mismatch: expected ${totalElements} elements, got A=${vectorsAConcatenated.length}, B=${vectorsBConcatenated.length}`,
    );
  }

  // Choose processing method based on memory constraints
  const canFitDirectly = canFitInMemory(vectorLength, numPairs);
  let results: Float32Array;
  let totalTime: number;
  let executionTime: number;
  let processingMethod: "direct" | "chunked";
  let chunksProcessed: number | undefined;

  if (canFitDirectly) {
    console.log("💾 Using direct processing (fits in memory)");
    processingMethod = "direct";

    const result = batch_dot_product_ultimate_external(
      vectorsAConcatenated,
      vectorsBConcatenated,
      vectorLength,
      numPairs,
    );

    if (result.length < 2 + numPairs) {
      throw new Error(
        `Unexpected result length: ${result.length}, expected at least ${2 + numPairs}`,
      );
    }

    totalTime = result[0] as number;
    executionTime = result[1] as number;
    results = new Float32Array(numPairs);
    for (let i = 0; i < numPairs; i++) {
      results[i] = result[2 + i] as number;
    }
  } else {
    console.log(
      "🔄 Using chunked processing (too large for direct processing)",
    );
    processingMethod = "chunked";

    const chunkResult = await processWorkloadInChunks(
      vectorsAConcatenated,
      vectorsBConcatenated,
      vectorLength,
      numPairs,
      batch_dot_product_ultimate_external,
    );

    results = chunkResult.results;
    totalTime = chunkResult.totalTime;
    executionTime = chunkResult.executionTime;
    chunksProcessed = chunkResult.chunksProcessed;
  }

  console.log(
    `✅ ${processingMethod.toUpperCase()} processing completed! Total: ${totalTime.toFixed(4)}ms, Execution: ${executionTime.toFixed(4)}ms`,
  );

  // STEP 3: Verify results against native JS (same verification logic)
  const firstVectorA = vectorsAConcatenated.subarray(0, vectorLength);
  const firstVectorB = vectorsBConcatenated.subarray(0, vectorLength);
  const lastStart = (numPairs - 1) * vectorLength;
  const lastVectorA = vectorsAConcatenated.subarray(
    lastStart,
    lastStart + vectorLength,
  );
  const lastVectorB = vectorsBConcatenated.subarray(
    lastStart,
    lastStart + vectorLength,
  );

  const firstExpected = nativeDotProduct(firstVectorA, firstVectorB);
  const lastExpected = nativeDotProduct(lastVectorA, lastVectorB);

  const firstActual = results[0];
  const lastActual = results[numPairs - 1];

  console.log(
    `🔍 Verification - First: ${Math.abs(firstActual - firstExpected) < 0.001 ? "✅" : "❌"} (${firstActual.toFixed(3)} vs ${firstExpected.toFixed(3)})`,
  );
  console.log(
    `🔍 Verification - Last: ${Math.abs(lastActual - lastExpected) < 0.001 ? "✅" : "❌"} (${lastActual.toFixed(3)} vs ${lastExpected.toFixed(3)})`,
  );

  // STEP 4: Calculate performance metrics
  const totalFlops = numPairs * vectorLength * 2;
  const gflops = totalFlops / (totalTime * 1_000_000);
  const memoryMB = (totalElements * 2 * 4) / (1024 * 1024);
  const memoryEfficiency = gflops / memoryMB;

  console.log(`⚡ Performance: ${gflops.toFixed(2)} GFLOPS`);
  console.log(`📊 Memory efficiency: ${memoryEfficiency.toFixed(3)} GFLOPS/MB`);
  if (chunksProcessed) {
    console.log(`🔄 Chunks processed: ${chunksProcessed}`);
  }

  return {
    totalTime,
    executionTime,
    gflops,
    memoryEfficiency,
    results,
    processingMethod,
    chunksProcessed,
  };
}

/**
 * Process dot products for arrays of vectors (cleaner API)
 * This function automatically determines vectorLength and numPairs from the input arrays
 */
export async function dotProduct(
  vectorsA: Array<Float32Array>,
  vectorsB: Array<Float32Array>,
): Promise<DotProductResult> {
  // Validate input arrays
  if (vectorsA.length !== vectorsB.length) {
    throw new Error(
      `Array length mismatch: vectorsA has ${vectorsA.length} vectors, vectorsB has ${vectorsB.length} vectors`,
    );
  }

  if (vectorsA.length === 0) {
    throw new Error("Cannot process empty vector arrays");
  }

  // Determine structure from the arrays
  const numPairs = vectorsA.length;
  const vectorLength = vectorsA[0].length;

  // Validate all vectors have the same length
  for (let i = 0; i < vectorsA.length; i++) {
    if (vectorsA[i].length !== vectorLength) {
      throw new Error(
        `Vector length mismatch in vectorsA[${i}]: expected ${vectorLength}, got ${vectorsA[i].length}`,
      );
    }
    if (vectorsB[i].length !== vectorLength) {
      throw new Error(
        `Vector length mismatch in vectorsB[${i}]: expected ${vectorLength}, got ${vectorsB[i].length}`,
      );
    }
  }

  console.log(
    `🎯 Processing dot products: ${numPairs} pairs of ${vectorLength}-dimensional vectors`,
  );

  // Convert arrays of vectors to concatenated arrays
  const vectorsAConcatenated = new Float32Array(numPairs * vectorLength);
  const vectorsBConcatenated = new Float32Array(numPairs * vectorLength);

  for (let i = 0; i < numPairs; i++) {
    const startIdx = i * vectorLength;
    vectorsAConcatenated.set(vectorsA[i], startIdx);
    vectorsBConcatenated.set(vectorsB[i], startIdx);
  }

  // Call the existing implementation
  const result = await dotProductFlat(
    vectorsAConcatenated,
    vectorsBConcatenated,
    vectorLength,
    numPairs,
  );

  // Return result without inferredStructure (since we explicitly know the structure)
  return {
    totalTime: result.totalTime,
    executionTime: result.executionTime,
    gflops: result.gflops,
    memoryEfficiency: result.memoryEfficiency,
    results: result.results,
    processingMethod: result.processingMethod,
    chunksProcessed: result.chunksProcessed,
  };
}

// =============================================================================
// HYBRID SEARCH ENGINE PLACEHOLDER
// =============================================================================

/**
 * Hybrid search engine class with full implementation
 * Combines text search (BM25FS⁺) with vector search using various fusion strategies
 */
export class HybridSearchEngine {
  private wasmEngine: any = null;
  private initialized = false;

  /**
   * Create a new search engine with optional schema
   */
  constructor(private schema?: SearchEngineSchema) {}

  /**
   * Initialize the search engine
   */
  async initialize(): Promise<void> {
    await initWasm();
    this.wasmEngine = new WasmSearchEngine();
    this.initialized = true;
  }

  /**
   * Add a document to the search index
   */
  async addDocument(document: DocumentInput): Promise<void> {
    if (!this.initialized || !this.wasmEngine) {
      throw new Error(
        "Search engine not initialized. Call initialize() first.",
      );
    }

    const wasmDoc = new WasmDocument(document.id);

    console.log(`🔧 TS: Creating document ${document.id} with ${document.fields.length} fields`);

    // Add text fields
    for (const field of document.fields) {
      console.log(`  📝 TS: Processing field '${field.name}' with value:`, field.value);
      if (typeof field.value === "string") {
        console.log(`    ✅ TS: Adding text field '${field.name}' = '${field.value}'`);
        wasmDoc.add_text_field(field.name, field.value);
      } else if (Array.isArray(field.value)) {
        // Join array values with spaces
        const joinedValue = field.value.join(" ");
        console.log(`    ✅ TS: Adding text field '${field.name}' = '${joinedValue}' (joined from array)`);
        wasmDoc.add_text_field(field.name, joinedValue);
      }
    }

    // Add vector if present
    if (document.vector) {
      const vectorArray = new Float32Array(document.vector);
      wasmDoc.set_vector(vectorArray);
    }

    this.wasmEngine.add_document(wasmDoc);
  }

  /**
   * Perform hybrid search with text and/or vector queries
   */
  async search(options: HybridSearchOptions): Promise<SearchResult[]> {
    if (!this.initialized || !this.wasmEngine) {
      throw new Error(
        "Search engine not initialized. Call initialize() first.",
      );
    }

    const topK = options.topK || 10;
    const strategy = options.strategy || "rrf";

    let textQuery: string | undefined;
    let vectorQuery: Float32Array | undefined;

    if (options.text) {
      textQuery = options.text;
    }

    if (options.vector) {
      vectorQuery = new Float32Array(options.vector);
    }

    const results = this.wasmEngine.search_hybrid(
      textQuery,
      vectorQuery,
      topK,
      strategy,
    );

    return results.map((result: any) => ({
      id: result.document_id,
      score: result.score,
    }));
  }

  /**
   * Perform text-only search
   */
  async searchText(query: string, topK = 10): Promise<SearchResult[]> {
    if (!this.initialized || !this.wasmEngine) {
      throw new Error(
        "Search engine not initialized. Call initialize() first.",
      );
    }

    const results = this.wasmEngine.search_text(query, topK);
    return results.map((result: any) => ({
      id: result.document_id,
      score: result.score,
    }));
  }

  /**
   * Perform vector-only search
   */
  async searchVector(query: Float32Array, topK = 10): Promise<SearchResult[]> {
    if (!this.initialized || !this.wasmEngine) {
      throw new Error(
        "Search engine not initialized. Call initialize() first.",
      );
    }

    const vectorQuery = new Float32Array(query);
    const results = this.wasmEngine.search_vector(vectorQuery, topK);
    return results.map((result: any) => ({
      id: result.document_id,
      score: result.score,
    }));
  }

  /**
   * Get search engine statistics
   */
  getStats(): { documentCount: number; indexSize: number } {
    if (!this.initialized || !this.wasmEngine) {
      return {
        documentCount: 0,
        indexSize: 0,
      };
    }

    const stats = this.wasmEngine.get_stats();
    return {
      documentCount: stats[0] as number,
      indexSize: stats[1] as number,
    };
  }
}
