import { createI18n, createTrans, type TranslationKeys } from "defuss";
import de from "../../i18n/de.json";
import en from "../../i18n/en.json";

/** All valid i18n key paths derived from the English translation file. */
export type Keys = TranslationKeys<typeof en>;

/** Typed i18n instance for the with-shadcn example app. */
export const i18n = createI18n<Keys>();

/** Translate a key to the current language. */
export const { t, loadLanguage, changeLanguage, subscribe } = i18n;

/** JSX translation component for reactive language switching. */
export const T = createTrans(i18n);

/** Load translation bundles and set the default language. */
export const initI18n = () => {
  loadLanguage("en", en);
  loadLanguage("de", de);
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("language") : null;
  changeLanguage(stored || "en");
};
