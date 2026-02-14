import type { FC } from "defuss";
import { Avatar, AvatarGroup, AvatarFallback } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const AvatarScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Avatar</h1>
            <p class="text-lg text-muted-foreground">An image element with a fallback for representing the user.</p>
            <CodePreview code={`<div className="flex flex-wrap items-center gap-4">
  <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
  <Avatar className="rounded-lg" src="https://github.com/shadcn.png" alt="@shadcn" />
  <AvatarGroup>
    <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
    <Avatar src="https://github.com/shadcn.png" alt="@shadcn" />
    <AvatarFallback>+2</AvatarFallback>
  </AvatarGroup>
</div>`} language="tsx">
                <div class="flex flex-wrap items-center gap-4">
                    <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
                    <Avatar className="rounded-lg" src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarGroup>
                        <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
                        <Avatar src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>+2</AvatarFallback>
                    </AvatarGroup>
                </div>
            </CodePreview>
        </div>
    );
};
