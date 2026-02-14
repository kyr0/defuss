import type { FC } from "defuss";

export const Introduction: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Introduction</h1>
            <p class="text-xl text-muted-foreground">
                Re-usable Shadcn components built with Tailwind 4, but without the fuss.
            </p>
            <div class="prose dark:prose-invert">
                <p>
                    This is a port of shadcn/ui to <strong>Defuss</strong>.
                </p>
            </div>
        </div>
    );
};
