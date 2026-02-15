import type { FC } from "defuss";
import { Avatar, AvatarFallback, AvatarGroup } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const AvatarScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Avatar</h1>
      <p class="text-lg text-muted-foreground">
        An image element with a fallback for representing the user.
      </p>
      <CodePreview
        code={`<div className="flex flex-wrap items-center gap-4">
   <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
   <Avatar className="rounded-lg" src="https://github.com/shadcn.png" alt="@shadcn" />
   <AvatarGroup>
     <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
     <Avatar src="https://github.com/shadcn.png" alt="@shadcn" />
     <AvatarFallback>+2</AvatarFallback>
   </AvatarGroup>
 </div>`}
        language="tsx"
      >
        <div class="flex flex-wrap items-center gap-4">
          <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
          <Avatar
            className="rounded-lg"
            src="https://github.com/shadcn.png"
            alt="@shadcn"
          />
          <AvatarGroup>
            <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
            <Avatar src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>+2</AvatarFallback>
          </AvatarGroup>
        </div>
      </CodePreview>
      <CodePreview
        code={`<div className="flex -space-x-2 [&_img]:ring-card [&_img]:ring-2 [&_img]:grayscale [&_img]:size-8 [&_img]:shrink-0 [&_img]:object-cover [&_img]:rounded-full">
   <img src="https://github.com/hunvreus.png" alt="@hunvreus" />
   <img src="https://github.com/shadcn.png" alt="@shadcn" />
   <img src="https://github.com/danielgross.png" alt="@danielgross" />
</div>`}
        language="tsx"
      >
        <div class="flex -space-x-2 [&_img]:ring-card [&_img]:ring-2 [&_img]:grayscale [&_img]:size-8 [&_img]:shrink-0 [&_img]:object-cover [&_img]:rounded-full">
          <img src="https://github.com/hunvreus.png" alt="@hunvreus" />
          <img src="https://github.com/shadcn.png" alt="@shadcn" />
          <img src="https://github.com/danielgross.png" alt="@danielgross" />
        </div>
      </CodePreview>
    </div>
  );
};
