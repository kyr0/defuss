import type { FC } from "defuss";

export const Installation: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Installation</h1>
            <p class="text-xl text-muted-foreground">
                How to install dependencies and structure your app.
            </p>
            <div class="rounded-md bg-muted p-4">
                <code class="text-sm">pnpm add defuss defuss-shadcn</code>
            </div>
        </div>
    );
};
