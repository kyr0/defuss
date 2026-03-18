import { $, createRef, Router, type FC } from "defuss";
import { changeLanguage, t } from "../i18n";

/** Dropdown for selecting the UI language. */
export const LanguageSwitcher: FC = () => {
  const selectRef = createRef<HTMLSelectElement>();

  const onMount = () => {
    const select = selectRef.current;
    if (!select) return;

    const stored = localStorage.getItem("language");
    if (stored) {
      select.value = stored;
    }

    select.addEventListener("change", () => {
      const lang = select.value;
      localStorage.setItem("language", lang);
      changeLanguage(lang);
      Router.navigate(window.location.pathname);
    });
  };

  return (
    <select ref={selectRef} class="select h-8 leading-none text-sm" aria-label={t("language.label")} onMount={onMount}>
      <option value="en">{t("language.en")}</option>
      <option value="de">{t("language.de")}</option>
    </select>
  );
};
