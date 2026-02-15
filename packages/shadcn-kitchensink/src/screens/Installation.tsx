import type { FC } from "defuss";

export const Installation: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Installation</h1>
            <p class="text-xl text-muted-foreground">
                Real project setup for defuss + defuss-shadcn.
            </p>

            <section class="space-y-3">
                <h2 class="text-2xl font-semibold tracking-tight">1) Install dependencies</h2>
                <div class="rounded-md bg-muted p-4 overflow-x-auto">
                    <pre><code class="text-sm">pnpm add defuss defuss-shadcn basecoat-css tailwindcss @tailwindcss/vite defuss-vite</code></pre>
                </div>
            </section>

            <section class="space-y-3">
                <h2 class="text-2xl font-semibold tracking-tight">2) Configure Vite</h2>
                <p class="text-muted-foreground">
                    Add both the defuss plugin and the Tailwind Vite plugin.
                </p>
                <div class="rounded-md bg-muted p-4 overflow-x-auto">
                    <pre><code class="text-sm">{`// vite.config.ts
import { defineConfig } from "vite";
import defuss from "defuss-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [defuss(), tailwindcss()],
});`}</code></pre>
                </div>
            </section>

            <section class="space-y-3">
                <h2 class="text-2xl font-semibold tracking-tight">3) Add required CSS imports</h2>
                <p class="text-muted-foreground">
                    Create <code>src/css/index.css</code> and import Tailwind + Basecoat (required).
                </p>
                <div class="rounded-md bg-muted p-4 overflow-x-auto">
                    <pre><code class="text-sm">{`/* src/css/index.css */
@import "tailwindcss";
@import "basecoat-css";

/* Optional app/theme layers */
@import "./theme.css";
@import "./custom.css";`}</code></pre>
                </div>
            </section>

            <section class="space-y-3">
                <h2 class="text-2xl font-semibold tracking-tight">4) Import CSS in app entry</h2>
                <div class="rounded-md bg-muted p-4 overflow-x-auto">
                    <pre><code class="text-sm">{`// src/main.tsx
import "./css/index.css";`}</code></pre>
                </div>
                <p class="text-muted-foreground">
                    Without this import, components render unstyled even if packages are installed.
                </p>
            </section>

            <section class="space-y-3">
                <h2 class="text-2xl font-semibold tracking-tight">5) Verify</h2>
                <div class="rounded-md bg-muted p-4 overflow-x-auto">
                    <pre><code class="text-sm">pnpm dev</code></pre>
                </div>
                <p class="text-muted-foreground">
                    Open a screen such as <code>/components/button</code> to confirm styles are loaded.
                </p>
            </section>

            <div class="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
                <strong>Important:</strong> Installing <code>defuss-shadcn</code> alone is not enough.
                You must include the CSS imports shown above.
            </div>
        </div>
    );
};
