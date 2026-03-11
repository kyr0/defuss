import {
  waitForSelector,
  waitForDomStable,
  showErrorBorder,
  showAutomationBorder,
  hideAutomationBorder,
} from "../lib/content-script/tools";
import { fill, click } from "../lib/content-script/synthetic-events";
import { interceptFetch } from "../lib/content-script/network-intercept";
import {
  waitForTabLoad,
  waitForContentScript,
  clearCookies,
  clearStorage,
} from "../lib/worker/tools";
import type { WorkItem, WorkItemResult } from "../types";
import type { WorkItemTool } from "../lib/worker/work-item-scheduler";
import type { ContentScriptTool } from "../lib/content-script/tool-registry";

// ---------------------------------------------------------------------------
// Payload / Result types
// ---------------------------------------------------------------------------

export interface ArztSuchePayload {
  /** Specialty or doctor name, e.g. "Psychiatrie und Psychotherapie" */
  query: string;
  /** City / zip, e.g. "80999 München" */
  place: string;
}

/** Raw API response from /api/data */
export type ArztSucheResult = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Worker-side tool
// ---------------------------------------------------------------------------

export const ArztSucheWorkerTool: WorkItemTool<
  ArztSuchePayload,
  ArztSucheResult
> = {
  type: "116117_arztsuche",

  async executeInWorker(
    item: WorkItem<ArztSuchePayload>,
  ): Promise<WorkItemResult<ArztSucheResult>> {
    const url = "https://arztsuche.116117.de/";

    let tabId: number | undefined;
    try {
      // Clear cookies and storage before opening tab to avoid session issues
      await clearCookies("https://arztsuche.116117.de");
      await clearStorage("https://arztsuche.116117.de");

      const focusTab = item.options?.focusAutomation ?? true;
      const tab = await chrome.tabs.create({ url, active: focusTab });
      tabId = tab.id;

      if (tabId === undefined) {
        return {
          success: false,
          error: {
            name: "TabError",
            message: "chrome.tabs.create returned no tab ID",
          },
        };
      }

      await waitForTabLoad(tabId);

      // Wait for the content script to initialise its RPC listener
      const rpc = await waitForContentScript(tabId);
      const result = (await rpc.TabRpc.executeTool("116117_arztsuche", {
        query: item.payload.query,
        place: item.payload.place,
      })) as WorkItemResult<ArztSucheResult>;

      const shouldClose = (item.options?.closeTab ?? true) && !item.debug;
      if (shouldClose) {
        chrome.tabs.remove(tabId).catch(() => {});
      }

      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      // Respect closeTab option — only close on failure when explicitly allowed
      const shouldClose = (item.options?.closeTab ?? true) && !item.debug;
      if (shouldClose && tabId !== undefined) {
        chrome.tabs.remove(tabId).catch(() => {});
      }
      return {
        success: false,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Content-script-side tool
// ---------------------------------------------------------------------------

async function executeArztSuche(
  data: ArztSuchePayload,
): Promise<WorkItemResult<ArztSucheResult>> {
  try {
    await showAutomationBorder();

    // 1. Wait for the Angular app to fully bootstrap and stabilise
    await waitForSelector(["#app"], 15_000);
    await waitForDomStable({
      selector: "#app",
      quietPeriodMs: 1_500,
      timeoutMs: 15_000,
    });

    // 2. Wait for the search form inputs
    const queryInput = await waitForSelector(
      ["#WenoderWasSearchInput"],
      15_000,
    );
    if (!queryInput) {
      throw new Error("Timeout: #WenoderWasSearchInput not found");
    }

    const placeInput = await waitForSelector(
      ["#Ort-PflichtfeldSearchInput"],
      5_000,
    );
    if (!placeInput) {
      throw new Error("Timeout: #Ort-PflichtfeldSearchInput not found");
    }

    // 3. Fill query field, then wait for DOM to settle (autocomplete, etc.)
    await fill(queryInput as HTMLInputElement, data.query);
    await waitForDomStable({
      selector: "#app",
      quietPeriodMs: 1_000,
      timeoutMs: 10_000,
    });

    // 4. Fill place field, then wait for DOM to settle
    await fill(placeInput as HTMLInputElement, data.place);
    await waitForDomStable({
      selector: "#app",
      quietPeriodMs: 1_000,
      timeoutMs: 10_000,
    });

    // 5. Select the first place autocomplete suggestion
    const placeOption = await waitForSelector(
      ["#Ort-PflichtfeldSearchInputOption_0"],
      10_000,
    );
    if (!placeOption) {
      throw new Error("Timeout: #Ort-PflichtfeldSearchInputOption_0 not found");
    }
    await click(placeOption as HTMLElement);

    // 6. Register network interceptor BEFORE clicking search
    const apiResponsePromise = interceptFetch("/api/data", 30_000);

    // 7. Click the search button
    const searchBtn = await waitForSelector(["#searchBtn"], 5_000);
    if (!searchBtn) {
      throw new Error("Timeout: #searchBtn not found");
    }
    await click(searchBtn as HTMLElement);

    // 8. Await the intercepted API response
    const intercepted = await apiResponsePromise;
    const apiResponse = JSON.parse(intercepted.body) as ArztSucheResult;
    console.log(
      `[arztsuche] intercepted /api/data (${intercepted.status}), entries:`,
      (apiResponse as Record<string, unknown>).arztPraxisDatas
        ? (
            (apiResponse as Record<string, unknown>)
              .arztPraxisDatas as unknown[]
          ).length
        : "unknown",
    );

    hideAutomationBorder();

    return { success: true, result: apiResponse };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    showErrorBorder();
    return {
      success: false,
      error: { name: error.name, message: error.message, stack: error.stack },
    };
  }
}

export const ArztSucheContentScriptTool: ContentScriptTool<
  ArztSuchePayload,
  ArztSucheResult
> = {
  type: "116117_arztsuche",
  execute: executeArztSuche,
};
