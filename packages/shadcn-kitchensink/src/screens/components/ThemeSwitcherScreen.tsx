import type { FC } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";

export const ThemeSwitcherScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Theme Switcher</h1>
      <p class="text-lg text-muted-foreground">
        A component that allows the user to switch between light and dark mode.
      </p>
      <p class="text-sm text-muted-foreground">
        Note: There is no dedicated Theme Switcher component in Basecoat.
        Instead, use the provided JavaScript pattern with the{" "}
        <code>basecoat:theme</code> custom event.
      </p>

      <h2
        id="javascript"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        JavaScript
      </h2>
      <p class="text-muted-foreground">
        Insert this JavaScript block at the beginning of your{" "}
        <code>&lt;head&gt;</code>:
      </p>
      <CodePreview
        code={`<script>
  (() => {
    try {
      const stored = localStorage.getItem('themeMode');
      if (stored ? stored === 'dark'
                  : matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    } catch (_) {}

    const apply = dark => {
      document.documentElement.classList.toggle('dark', dark);
      try { localStorage.setItem('themeMode', dark ? 'dark' : 'light'); } catch (_) {}
    };

    document.addEventListener('basecoat:theme', (event) => {
      const mode = event.detail?.mode;
      apply(mode === 'dark' ? true
            : mode === 'light' ? false
            : !document.documentElement.classList.contains('dark'));
    });
  })();
</script>`}
        language="html"
      />

      <h2
        id="button"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Button Implementation
      </h2>
      <CodePreview
        code={`<button
  type="button"
  aria-label="Toggle dark mode"
  data-tooltip="Toggle dark mode"
  data-side="bottom"
  onclick="document.dispatchEvent(new CustomEvent('basecoat:theme'))"
  class="btn-icon-outline size-8"
>
  <span class="hidden dark:block">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  </span>
  <span class="block dark:hidden">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  </span>
</button>`}
        language="tsx"
      >
        <button
          type="button"
          aria-label="Toggle dark mode"
          onClick={() =>
            document.dispatchEvent(new CustomEvent("basecoat:theme"))
          }
          class="btn-icon-outline size-8"
        >
          <span class="hidden dark:block">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </span>
          <span class="block dark:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </span>
        </button>
      </CodePreview>

      <h2
        id="explicit"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Set Theme Explicitly
      </h2>
      <CodePreview
        code={`<div class="flex gap-2">
  <button type="button" class="btn" onclick="document.dispatchEvent(new CustomEvent('basecoat:theme', { detail: { mode: 'light' } }))">Light</button>
  <button type="button" class="btn" onclick="document.dispatchEvent(new CustomEvent('basecoat:theme', { detail: { mode: 'dark' } }))">Dark</button>
  <button type="button" class="btn" onclick="document.dispatchEvent(new CustomEvent('basecoat:theme'))">Toggle</button>
</div>`}
        language="tsx"
      >
        <div class="flex gap-2">
          <button
            type="button"
            class="btn"
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("basecoat:theme", {
                  detail: { mode: "light" },
                }),
              )
            }
          >
            Light
          </button>
          <button
            type="button"
            class="btn"
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("basecoat:theme", { detail: { mode: "dark" } }),
              )
            }
          >
            Dark
          </button>
          <button
            type="button"
            class="btn"
            onClick={() =>
              document.dispatchEvent(new CustomEvent("basecoat:theme"))
            }
          >
            Toggle
          </button>
        </div>
      </CodePreview>
    </div>
  );
};
