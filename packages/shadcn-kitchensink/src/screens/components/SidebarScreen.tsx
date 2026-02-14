import type { FC } from "defuss";
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SidebarScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Sidebar</h1>
            <p class="text-lg text-muted-foreground">A composable and customizable sidebar component.</p>
                        <CodePreview previewClassName="items-start justify-start" code={`<>
    <div className="relative h-72 w-full max-w-3xl overflow-hidden rounded-lg border">
        <Sidebar id="demo-sidebar" className="absolute inset-y-0 left-0 [&+*]:!ml-0 [&+*]:!mr-0 [&>nav]:!absolute [&>nav]:!inset-y-0 [&>nav]:!left-0 [&>nav]:!h-full [&>nav]:!w-64" initialOpen>
            <SidebarHeader className="p-3 border-b">Navigation</SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-2 py-1.5 text-xs">Getting started</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem><SidebarMenuButton href="#">Playground</SidebarMenuButton></SidebarMenuItem>
                        <SidebarMenuItem><SidebarMenuButton href="#">Models</SidebarMenuButton></SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-3 border-t text-sm text-muted-foreground">Footer</SidebarFooter>
        </Sidebar>
        <main className="h-full bg-muted/20 p-4">Main content area</main>
    </div>
  <SidebarTrigger sidebarId="demo-sidebar" className="btn-outline mt-3">Toggle sidebar</SidebarTrigger>
</>`} language="tsx" className="w-full">
                <div class="w-full max-w-xl">
                        <div class="relative h-72 w-full overflow-hidden rounded-lg border">
                                <Sidebar id="demo-sidebar" className="absolute inset-y-0 left-0 [&+*]:!ml-0 [&+*]:!mr-0 [&>nav]:!absolute [&>nav]:!inset-y-0 [&>nav]:!left-0 [&>nav]:!h-full [&>nav]:!w-64" initialOpen>
                                        <SidebarHeader className="p-3 border-b">Navigation</SidebarHeader>
                                        <SidebarContent className="p-2">
                                                <SidebarGroup>
                                                        <SidebarGroupLabel className="px-2 py-1.5 text-xs">Getting started</SidebarGroupLabel>
                                                        <SidebarMenu>
                                                                <SidebarMenuItem><SidebarMenuButton href="#">Playground</SidebarMenuButton></SidebarMenuItem>
                                                                <SidebarMenuItem><SidebarMenuButton isActive href="#">Models</SidebarMenuButton></SidebarMenuItem>
                                                        </SidebarMenu>
                                                </SidebarGroup>
                                        </SidebarContent>
                                        <SidebarFooter className="p-3 border-t text-sm text-muted-foreground">Footer</SidebarFooter>
                                </Sidebar>
                                <main class="h-full bg-muted/20 p-4">Main content area</main>
                        </div>
                    <SidebarTrigger sidebarId="demo-sidebar" className="btn-outline mt-3">Toggle sidebar</SidebarTrigger>
                </div>
            </CodePreview>
        </div>
    );
};
