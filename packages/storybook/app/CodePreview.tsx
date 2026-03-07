import type { FC } from "defuss";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "defuss-shadcn";
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
  const previewTabValue = `preview-${uniqueId}`;
  const codeTabValue = `code-${uniqueId}`;

  return (
    <div class="relative my-4">
      <Tabs
        defaultValue={activeTab === "code" ? codeTabValue : previewTabValue}
        className="w-full"
      >
        <TabsList>
          {tabsVisible.includes("preview") && (
            <TabsTrigger value={previewTabValue}>Preview</TabsTrigger>
          )}
          {tabsVisible.includes("code") && (
            <TabsTrigger value={codeTabValue}>Code</TabsTrigger>
          )}
        </TabsList>
        {tabsVisible.includes("preview") && (
          <TabsContent value={previewTabValue}>
            <div class="ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative rounded-md border">
              <div class={`preview min-h-[200px] w-full p-10 ${previewClassName || ""}`}>
                <div class={`w-full ${className || ""}`}>{children}</div>
              </div>
            </div>
          </TabsContent>
        )}
        {tabsVisible.includes("code") && (
          <TabsContent value={codeTabValue}>
            <CodeBlock code={code} language={language} className="" />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
