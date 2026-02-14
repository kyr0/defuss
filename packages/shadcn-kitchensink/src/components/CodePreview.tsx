import type { FC } from "defuss";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "defuss-shadcn";
import { CodeBlock } from "./CodeBlock.js";

export interface CodePreviewProps {
    code: string;
    children?: any;
    className?: string; // Class for the preview wrapper (green div in njk)
    previewClassName?: string; // Class for the inner preview div
    language?: string;
}

let previewIdCounter = 0;

export const CodePreview: FC<CodePreviewProps> = ({ code, children, className, previewClassName, language = "html" }) => {
    // Ensure unique IDs for tabs to avoid conflicts
    const uniqueId = ++previewIdCounter;
    const previewTabValue = `preview-${uniqueId}`;
    const codeTabValue = `code-${uniqueId}`;

    return (
        <div class="relative my-6">
            <Tabs defaultValue={previewTabValue} className="w-full">
                <TabsList>
                    <TabsTrigger value={previewTabValue}>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger value={codeTabValue}>
                        Code
                    </TabsTrigger>
                </TabsList>
                <TabsContent value={previewTabValue}>
                    <div class="ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative rounded-md border">
                        <div class={`preview flex min-h-[350px] w-full justify-center p-10 items-center ${previewClassName || ''}`}>
                            <div class={`${className || ''}`}>
                                {children}
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value={codeTabValue}>
                    <CodeBlock code={code} language={language} className="" />
                </TabsContent>
            </Tabs>
        </div>
    );
};
