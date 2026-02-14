import type { FC } from "defuss";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const BreadcrumbScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Breadcrumb</h1>
            <p class="text-lg text-muted-foreground">Displays the path to the current resource using a hierarchy of links.</p>

                        <h2 id="example-basic" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Basic</h2>
            <CodePreview code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator>›</BreadcrumbSeparator>
    <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator>›</BreadcrumbSeparator>
    <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`} language="tsx">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator>›</BreadcrumbSeparator>
                        <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator>›</BreadcrumbSeparator>
                        <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </CodePreview>

            <h2 id="example-ellipsis" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Ellipsis in middle</h2>
            <CodePreview previewClassName="items-start justify-start" code={`<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator>›</BreadcrumbSeparator>
    <BreadcrumbItem>
      <DropdownMenu id="demo-breadcrumb-menu">
        <DropdownMenuTrigger id="demo-breadcrumb-menu-trigger" className="flex size-9 items-center justify-center h-4 w-4 hover:text-foreground cursor-pointer">...</DropdownMenuTrigger>
        <DropdownMenuContent id="demo-breadcrumb-menu-popover">
          <DropdownMenuItem>Documentation</DropdownMenuItem>
          <DropdownMenuItem>Themes</DropdownMenuItem>
          <DropdownMenuItem>GitHub</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
    <BreadcrumbSeparator>›</BreadcrumbSeparator>
    <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator>›</BreadcrumbSeparator>
    <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`} language="tsx">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator>›</BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <DropdownMenu id="demo-breadcrumb-menu">
                                <DropdownMenuTrigger id="demo-breadcrumb-menu-trigger" className="flex size-9 items-center justify-center h-4 w-4 hover:text-foreground cursor-pointer" aria-label="More breadcrumbs">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="19" cy="12" r="1" />
                                        <circle cx="5" cy="12" r="1" />
                                    </svg>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent id="demo-breadcrumb-menu-popover">
                                    <DropdownMenuItem>Documentation</DropdownMenuItem>
                                    <DropdownMenuItem>Themes</DropdownMenuItem>
                                    <DropdownMenuItem>GitHub</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>›</BreadcrumbSeparator>
                        <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
                        <BreadcrumbSeparator>›</BreadcrumbSeparator>
                        <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </CodePreview>
        </div>
    );
};
