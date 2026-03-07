import type { FC } from "defuss";
import { CodeBlock } from "./CodeBlock.js";

export interface CodePreviewProps {
  code: string;
  children?: any;
  className?: string;
  previewClassName?: string;
  language?: string;
  activeTab?: "preview" | "code";
  tabsVisible?: ("preview" | "code")[];
}

let previewIdCounter = 0;

export const CodePreview: FC<CodePreviewProps> = ({
  code,
  children,
  className,
  previewClassName,
  language = "tsx",
  activeTab,
  tabsVisible = ["preview", "code"],
}) => {
  const uniqueId = ++previewIdCounter;
  const previewTabId = `sb-preview-tab-${uniqueId}`;
  const codeTabId = `sb-code-tab-${uniqueId}`;
  const previewPanelId = `sb-preview-panel-${uniqueId}`;
  const codePanelId = `sb-code-panel-${uniqueId}`;

  const isPreviewDefault = activeTab !== "code";

  const switchTab = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest?.("[role=tab]") as HTMLButtonElement | null;
    if (!btn) return;
    const tabGroup = btn.closest("[role=tablist]")?.parentElement;
    if (!tabGroup) return;

    // Toggle active tab styling
    const tabs = tabGroup.querySelectorAll("[role=tab]");
    tabs.forEach((tab) => {
      tab.setAttribute("aria-selected", "false");
      tab.classList.remove("data-[state=active]:bg-background", "data-[state=active]:shadow-sm");
      (tab as HTMLElement).dataset.state = "inactive";
    });
    btn.setAttribute("aria-selected", "true");
    btn.dataset.state = "active";

    // Toggle panels
    const panels = tabGroup.querySelectorAll("[role=tabpanel]");
    panels.forEach((panel) => {
      (panel as HTMLElement).style.display = "none";
    });
    const targetId = btn.getAttribute("aria-controls");
    if (targetId) {
      const target = tabGroup.querySelector(`#${targetId}`) as HTMLElement;
      if (target) target.style.display = "block";
    }
  };

  return (
    <div class="relative my-4">
      <div>
        <div role="tablist" class="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground mb-2">
          {tabsVisible.includes("preview") && (
            <button
              role="tab"
              aria-selected={isPreviewDefault ? "true" : "false"}
              aria-controls={previewPanelId}
              id={previewTabId}
              data-state={isPreviewDefault ? "active" : "inactive"}
              class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
              onClick={switchTab}
            >
              Preview
            </button>
          )}
          {tabsVisible.includes("code") && (
            <button
              role="tab"
              aria-selected={!isPreviewDefault ? "true" : "false"}
              aria-controls={codePanelId}
              id={codeTabId}
              data-state={!isPreviewDefault ? "active" : "inactive"}
              class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
              onClick={switchTab}
            >
              Code
            </button>
          )}
        </div>

        {tabsVisible.includes("preview") && (
          <div
            role="tabpanel"
            id={previewPanelId}
            aria-labelledby={previewTabId}
            style={{ display: isPreviewDefault ? "block" : "none" }}
          >
            <div class="ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative rounded-md border">
              <div class={`preview flex min-h-[200px] w-full justify-center p-10 items-start ${previewClassName || ""}`}>
                <div class={className || ""}>{children}</div>
              </div>
            </div>
          </div>
        )}

        {tabsVisible.includes("code") && (
          <div
            role="tabpanel"
            id={codePanelId}
            aria-labelledby={codeTabId}
            style={{ display: !isPreviewDefault ? "block" : "none" }}
          >
            <CodeBlock code={code} language={language} className="" />
          </div>
        )}
      </div>
    </div>
  );
};
