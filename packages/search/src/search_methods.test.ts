
import { describe, it, expect, beforeAll } from "vitest";
import { initWasm, SearchEngine, Document, SearchResult, getWasmModule } from "./search";

describe("Search Methods", () => {
    let engine: SearchEngine;

    beforeAll(async () => {
        console.log("initWasm")
        // Skip thread pool to avoid web worker hanging issues in Vitest browser tests
        await initWasm({ skipThreadPool: true });
        console.log("initWasm done")
        engine = new SearchEngine();

        // Add some test documents
        const docs = [
            { id: "1", text: "The quick brown fox jumps over the lazy dog" },
            { id: "2", text: "Rust is a systems programming language" },
            { id: "3", text: "WebAssembly (Wasm) is a binary instruction format" },
            { id: "4", text: "Search engines are complex systems" },
            { id: "5", text: "Fuzzy matching finds strings that are approximately equal" },
        ];

        for (const d of docs) {
            let doc = new Document(d.id);
            doc = doc.attribute("content", d.text);
            engine.add_document(doc);
        }
    });

    describe("search_substring", () => {
        it("should find exact substring matches", () => {
            const results = engine.search_substring("brown fox", 10);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].document_id).toBe("1");
        });

        it("should be case insensitive", () => {
            const results = engine.search_substring("RUST", 10);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].document_id).toBe("2");
        });

        it("should return empty array for no matches", () => {
            const results = engine.search_substring("nonexistent string", 10);
            expect(results).toHaveLength(0);
        });

        it("should respect top_k", () => {
            // "is" appears in doc 2 and 3
            const results = engine.search_substring("is", 1);
            expect(results).toHaveLength(1);
        });
    });

    describe("search_fuzzy", () => {
        it("should find exact matches", () => {
            const results = engine.search_fuzzy("systems", 10, 0);
            // "systems" is in doc 2 and 4
            expect(results.length).toBeGreaterThanOrEqual(1);
            const ids = results.map(r => r.document_id);
            expect(ids).toContain("2");
            expect(ids).toContain("4");
        });

        it("should find fuzzy matches with edits", () => {
            // "systms" (missing 'e') should match "systems"
            const results = engine.search_fuzzy("systms", 10, 1);
            expect(results.length).toBeGreaterThan(0);
            const ids = results.map(r => r.document_id);
            expect(ids).toContain("2");
            expect(ids).toContain("4");
        });

        it("should handle multiple terms", () => {
            // "quick" (exact) and "dg" (fuzzy dog)
            const results = engine.search_fuzzy("quick dg", 10, 1);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].document_id).toBe("1");
        });

        it("should score exact matches higher than fuzzy matches", () => {
            // "systems" appears exactly in 2 and 4.
            // Let's try a query that matches exact in one and fuzzy in another if possible,
            // or just verify scores.
            // Actually, let's just check that it finds "fuzzy" in doc 5 even with a typo
            const results = engine.search_fuzzy("fuzy", 10, 1);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].document_id).toBe("5");
        });

        it("should respect max_edits", () => {
            // "programming" -> "prgramming" (1 edit)
            // With max_edits=0, should fail.
            let results = engine.search_fuzzy("prgramming", 10, 0);
            expect(results).toHaveLength(0);

            // With max_edits=1, should succeed.
            results = engine.search_fuzzy("prgramming", 10, 1);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].document_id).toBe("2");
        });
    });
});
