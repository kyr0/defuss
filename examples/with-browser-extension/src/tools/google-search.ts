import { createTabRpcClient } from "../lib/rpc";
import { htmlToMarkdown } from "../lib/content-script/html-to-markdown";
import {
  waitForSelector,
  waitForDomStable,
  showErrorBorder,
  showAutomationBorder,
  hideAutomationBorder,
} from "../lib/content-script/tools";
import { waitForTabLoad } from "../lib/worker/tools";
import type { TabRpcApi } from "../tab-rpc";
import type { WorkItem, WorkItemResult } from "../types";
import type { WorkItemTool } from "../lib/worker/work-item-scheduler";
import type { ContentScriptTool } from "../lib/content-script/tool-registry";

export interface GoogleSearchPayload {
  query: string;
  topK?: number;
  /** Whether to wait for and include Google's AI summary (default: false) */
  aiSummary?: boolean;
}

/** Result type returned by the google_search tool */
export type GoogleSearchResult = string;

/**
 * Worker-side tool that opens a Google Search tab and delegates
 * DOM extraction to the content script running in that tab.
 */
export const GoogleSearchWorkerTool: WorkItemTool<GoogleSearchPayload, string> =
  {
    type: "google_search",

    async executeInWorker(
      item: WorkItem<GoogleSearchPayload>,
    ): Promise<WorkItemResult<string>> {
      const { query, topK } = item.payload;
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      let tabId: number | undefined;
      try {
        // Open the search tab (focused by default unless options say otherwise)
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

        // Wait for the page to fully load
        await waitForTabLoad(tabId);

        // Call the content script's executeTool via tab RPC
        const rpc = await createTabRpcClient<{ TabRpc: TabRpcApi }>(tabId);
        const result = (await rpc.TabRpc.executeTool("google_search", {
          topK: topK ?? 3,
          aiSummary: item.payload.aiSummary,
        })) as WorkItemResult<string>;

        // Close tab unless debug mode, closeTab is false, or the search failed
        const shouldClose = item.options?.closeTab ?? true;
        if (result.success && !item.debug && shouldClose) {
          chrome.tabs.remove(tabId).catch(() => {});
        }

        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        // Leave tab open on error for diagnostics
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

// --- Content-script-side executor (runs in tab's isolated world) ---

/**
 * Execute Google Search DOM extraction inside the tab's content-script context.
 */
async function executeGoogleSearch(data: {
  topK?: number;
  aiSummary?: boolean;
}): Promise<WorkItemResult<string>> {
  try {
    const { topK = 3, aiSummary = false } = data;

    // Signal that this tab is being automated
    await showAutomationBorder();

    // Wait for either answer box or organic results
    await waitForSelector(
      ['[data-spe="true"]', '[data-subtree="aimc"]', "[data-rpos]"],
      10_000,
    );

    let resultMarkdown = "";

    if (aiSummary) {
      // Wait for the AI summary content to finish streaming/rendering
      await waitForDomStable({
        selector: '[data-subtree="aimc"], [data-spe="true"]',
        quietPeriodMs: 500,
        timeoutMs: 10_000,
      });

      const aiSummaryContent =
        document.querySelector('[data-subtree="aimc"]') ??
        document.querySelector('[data-spe="true"]');

      if (aiSummaryContent) {
        resultMarkdown += "### AI Summary\n";
        resultMarkdown += htmlToMarkdown(aiSummaryContent);
        resultMarkdown += "\n\n---\n\n";
      }
    }

    // 1. Top K organic results
    const results = Array.from(document.querySelectorAll("[data-rpos]"));
    const topResults = results.slice(0, topK);

    if (topResults.length > 0) {
      resultMarkdown += `### Top ${topResults.length} Results\n`;
      for (let i = 0; i < topResults.length; i++) {
        resultMarkdown += `\n#### Result ${i + 1}\n`;
        resultMarkdown += htmlToMarkdown(topResults[i]);
        resultMarkdown += "\n";
      }
    }

    if (!resultMarkdown) {
      hideAutomationBorder();
      return { success: true, result: "No results found." };
    }

    hideAutomationBorder();
    return { success: true, result: resultMarkdown };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    showErrorBorder();
    return {
      success: false,
      error: { name: error.name, message: error.message, stack: error.stack },
    };
  }
}

/** Content-script-side tool registration for Google Search */
export const GoogleSearchContentScriptTool: ContentScriptTool<
  { topK?: number; aiSummary?: boolean },
  string
> = {
  type: "google_search",
  execute: executeGoogleSearch,
};
