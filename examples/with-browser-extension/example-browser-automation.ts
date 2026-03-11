/**
 * Example: Browser Automation with defuss browser extension
 *
 * Starts the RPC server and demonstrates how to enqueue work items
 * that the browser extension picks up, executes, and returns results for.
 *
 * Run with:  tsx example-browser-automation.ts
 */
import "./src/server/server.js";
import { doWorkItem, server } from "./src/server/server.js";
import type {
  GoogleSearchPayload,
  GoogleSearchResult,
} from "./src/tools/google-search.js";
import type {
  ArztSuchePayload,
  ArztSucheResult,
} from "./src/tools/116117-arztsuche.js";

// start the server
await server.start();

// --- Example Use Cases ---

// enqueue + wait for the result
/*
const result = await doWorkItem<GoogleSearchPayload, GoogleSearchResult>({
  type: "google_search",
  payload: {
    query: "What's the defuss framework by kyr0 (Aron Homberg)?",
    aiSummary: true,
  },
  options: { focusAutomation: true, closeTab: false },
});
console.log("[example] doWorkItem result:", result.result);
*/

// enqueue + wait for 116117 Arztsuche result
const arztResult = await doWorkItem<ArztSuchePayload, ArztSucheResult>({
  type: "116117_arztsuche",
  payload: {
    query: "Psychiatrie und Psychotherapie",
    place: "80999 München",
  },
  options: { focusAutomation: true, closeTab: false, retry: false },
});
console.log("[example] arztsuche result:", arztResult.result);

await server.stop();

process.exit(0);
