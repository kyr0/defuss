import { type FC, createRef } from "defuss";
import { storybookConfig } from "./App.js";

/**
 * Dark/light mode toggle + theme variant switcher.
 * Uses the same `basecoat:theme` CustomEvent pattern as the kitchensink.
 */
export const ThemeSwitcher: FC = () => {
  const themeSelectRef = createRef<HTMLSelectElement>();

  const themes: Array<{ name: string; className: string }> =
    storybookConfig.themes || [];

  const toggleDarkMode = () => {
    document.dispatchEvent(new CustomEvent("basecoat:theme"));
  };

  const applyThemeVariant = (themeVariant: string) => {
    // Remove all existing theme-* classes
    document.documentElement.classList.forEach((c) => {
      if (c.startsWith("theme-")) document.documentElement.classList.remove(c);
    });
    if (themeVariant) {
      document.documentElement.classList.add(`theme-${themeVariant}`);
      localStorage.setItem("themeVariant", themeVariant);
    } else {
      localStorage.removeItem("themeVariant");
    }
  };

  const onMount = () => {
    const select = themeSelectRef.current;
    if (!select) return;

    const stored = localStorage.getItem("themeVariant");
    if (stored) {
      select.value = stored;
      applyThemeVariant(stored);
    }

    select.addEventListener("change", () => {
      applyThemeVariant(select.value);
    });
  };

  return (
    <div class="flex items-center gap-1.5" onMount={onMount}>
      {/* Theme variant select - only if themes are configured */}
      {themes.length > 0 && (
        <select ref={themeSelectRef} class="select h-7 text-xs leading-none">
          <option value="">Default</option>
          {themes.map((t) => (
            <option
              key={t.name}
              value={t.name.toLowerCase().replace(/\s+/g, "-")}
            >
              {t.name}
            </option>
          ))}
        </select>
      )}

      {/* Dark/light toggle */}
      <button
        class="btn-icon-outline size-7"
        onClick={toggleDarkMode}
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        <span class="hidden dark:block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
            width="14"
            height="14"
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
    </div>
  );
};
