/**
 * Hybrid Search Engine Benchmark Tests
 */
import { beforeAll, describe, it, expect } from "vitest";
import {
  HybridSearchEngine,
  initWasm,
  type DocumentInput,
  type SearchResult,
} from "./search.js";

describe("hybrid search benchmarks", () => {
  let searchEngine: HybridSearchEngine;

  beforeAll(async () => {
    console.log("🚀 Initializing WASM for search engine...");
    try {
      await initWasm();
      console.log("✅ WASM initialized successfully");
      
      searchEngine = new HybridSearchEngine();
      await searchEngine.initialize();
      console.log("✅ Search engine initialized successfully");
    } catch (error) {
      console.error("❌ Initialization failed:", error);
      throw error;
    }
  });

  it("should index documents and perform text search", async () => {
    console.log("� Testing document indexing and text search...");
    
    const documents: DocumentInput[] = [
      {
        id: "doc1",
        fields: [
          { name: "title", value: "Machine Learning Fundamentals" },
          { name: "content", value: "This document covers the basics of machine learning algorithms and neural networks." }
        ]
      },
      {
        id: "doc2", 
        fields: [
          { name: "title", value: "Deep Learning Guide" },
          { name: "content", value: "Advanced techniques in deep learning, including transformers and attention mechanisms." }
        ]
      },
      {
        id: "doc3",
        fields: [
          { name: "title", value: "Data Science Handbook" },
          { name: "content", value: "Comprehensive guide to data analysis, statistics, and machine learning applications." }
        ]
      }
    ];

    // Index documents
    console.log("📚 Indexing documents...");
    for (const doc of documents) {
      console.log(`  Indexing document: ${doc.id}`);
      await searchEngine.addDocument(doc);
    }
    console.log("✅ Documents indexed successfully");

    // Check stats after indexing
    const statsAfterIndexing = searchEngine.getStats();
    console.log("📊 Stats after indexing:", statsAfterIndexing);

    // Test text search
    console.log("🔍 Performing text search...");
    const textResults = await searchEngine.searchText("machine learning", 10);
    
    console.log("📊 Text search results:", textResults.length);
    textResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.id} (score: ${result.score.toFixed(3)})`);
    });

    expect(textResults.length).toBeGreaterThan(0);
    expect(textResults[0].id).toBeDefined();
    expect(textResults[0].score).toBeGreaterThan(0);

    console.log("🎉 Text search test passed!");
  });

  it("should perform vector search", async () => {
    console.log("🧮 Testing vector search...");
    
    // Create documents with vectors
    const documentsWithVectors: DocumentInput[] = [
      {
        id: "vec1",
        fields: [
          { name: "title", value: "Document One" },
          { name: "content", value: "Content for document one" }
        ],
        vector: new Float32Array([1.0, 0.5, 0.2, 0.8])
      },
      {
        id: "vec2",
        fields: [
          { name: "title", value: "Document Two" },
          { name: "content", value: "Content for document two" }
        ],
        vector: new Float32Array([0.9, 0.6, 0.1, 0.7])
      },
      {
        id: "vec3",
        fields: [
          { name: "title", value: "Document Three" },
          { name: "content", value: "Content for document three" }
        ],
        vector: new Float32Array([0.2, 0.8, 0.9, 0.1])
      }
    ];

    // Index documents with vectors
    for (const doc of documentsWithVectors) {
      await searchEngine.addDocument(doc);
    }

    // Test vector search
    const queryVector = new Float32Array([1.0, 0.5, 0.3, 0.7]);
    const vectorResults = await searchEngine.searchVector(queryVector, 5);
    
    console.log("📊 Vector search results:", vectorResults.length);
    vectorResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.id} (score: ${result.score.toFixed(3)})`);
    });

    expect(vectorResults.length).toBeGreaterThan(0);
    expect(vectorResults[0].id).toBeDefined();
    expect(vectorResults[0].score).toBeGreaterThan(0);

    console.log("🎉 Vector search test passed!");
  });

  it("should perform hybrid search with fusion", async () => {
    console.log("� Testing hybrid search with fusion...");
    
    // Test hybrid search combining text and vector
    const queryVector = new Float32Array([0.8, 0.6, 0.4, 0.5]);
    
    // Test RRF fusion
    const rrfResults = await searchEngine.search({
      text: "document",
      vector: queryVector,
      topK: 5,
      strategy: "rrf"
    });
    
    console.log("📊 RRF fusion results:", rrfResults.length);
    rrfResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.id} (score: ${result.score.toFixed(3)})`);
    });

    // Test CombSUM fusion
    const combsumResults = await searchEngine.search({
      text: "content",
      vector: queryVector,
      topK: 5,
      strategy: "combsum"
    });
    
    console.log("📊 CombSUM fusion results:", combsumResults.length);
    combsumResults.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.id} (score: ${result.score.toFixed(3)})`);
    });

    expect(rrfResults.length).toBeGreaterThan(0);
    expect(combsumResults.length).toBeGreaterThan(0);

    // Check that we get some results
    expect(rrfResults[0].id).toBeDefined();
    expect(combsumResults[0].id).toBeDefined();

    console.log("🎉 Hybrid search test passed!");
  });

  it("should provide search engine statistics", async () => {
    console.log("📈 Testing search engine statistics...");
    
    const stats = searchEngine.getStats();
    console.log("📊 Engine stats:", stats);
    
    expect(stats.documentCount).toBeGreaterThan(0);
    expect(stats.indexSize).toBeGreaterThanOrEqual(0);

    console.log("🎉 Statistics test passed!");
  });
});
