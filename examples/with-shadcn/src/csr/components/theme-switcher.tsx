import { createRef, type FC } from "defuss";
import { t } from "../i18n";

const applyThemeVariant = (themeVariant: string) => {
  document.documentElement.classList.forEach((c) => {
    if (c.startsWith("theme-")) {
      document.documentElement.classList.remove(c);
    }
  });

  if (themeVariant) {
    document.documentElement.classList.add(`theme-${themeVariant}`);
    localStorage.setItem("themeVariant", themeVariant);
  } else {
    localStorage.removeItem("themeVariant");
  }
};

/** Dropdown for selecting a theme variant and toggling dark mode. */
export const ThemeSwitcher: FC = () => {
  const themeSelectRef = createRef<HTMLSelectElement>();

  const onMount = () => {
    const themeSelect = themeSelectRef.current;

    if (themeSelect) {
      const storedTheme = localStorage.getItem("themeVariant");
      themeSelect.value = storedTheme || "";
      if (storedTheme) {
        applyThemeVariant(storedTheme);
      }

      themeSelect.addEventListener("change", () => {
        applyThemeVariant(themeSelect.value);
      });
    }
  };

  const toggleTheme = () => {
    document.dispatchEvent(new CustomEvent("defuss:theme"));
  };

  return (
    <div class="flex items-center gap-2" onMount={onMount}>
      <select ref={themeSelectRef} class="select h-8 leading-none text-sm" aria-label={t("theme.variant_label")}>
        <option value="">{t("theme.default")}</option>
        <option value="claude">{t("theme.claude")}</option>
        <option value="doom-64">{t("theme.doom_64")}</option>
        <option value="supabase">{t("theme.supabase")}</option>
      </select>

      <button
        type="button"
        class="btn-icon-outline size-8"
        onClick={toggleTheme}
        aria-label={t("theme.toggle_dark_mode")}
        title={t("theme.toggle_dark_mode")}
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
            class="lucide lucide-sun"
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
            class="lucide lucide-moon"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </span>
      </button>
    </div>
  );
};
