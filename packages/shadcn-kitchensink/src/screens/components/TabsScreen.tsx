import type { FC } from "defuss";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const TabsScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Tabs</h1>
            <p class="text-lg text-muted-foreground">A set of layered sections of content—known as tab panels.</p>
            <CodePreview code={`<Tabs defaultValue="account" className="w-full max-w-md">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Manage your account settings.</TabsContent>
  <TabsContent value="password">Change your password here.</TabsContent>
</Tabs>`} language="tsx">
                <Tabs defaultValue="account" className="w-full max-w-md">
                    <TabsList>
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="password">Password</TabsTrigger>
                    </TabsList>
                    <TabsContent value="account">Manage your account settings.</TabsContent>
                    <TabsContent value="password">Change your password here.</TabsContent>
                </Tabs>
            </CodePreview>
        </div>
    );
};
