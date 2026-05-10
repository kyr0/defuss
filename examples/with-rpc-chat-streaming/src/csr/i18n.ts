import { createI18n, createTrans, type TranslationKeys } from "defuss";
import de from "../../i18n/de.json";
import en from "../../i18n/en.json";

export type Keys = TranslationKeys<typeof en>;

export const i18n = createI18n<Keys>();

export const { t, loadLanguage, changeLanguage, subscribe } = i18n;

export const T = createTrans(i18n);

export const initI18n = () => {
	loadLanguage("en", en);
	loadLanguage("de", de);
	const stored = typeof localStorage !== "undefined" ? localStorage.getItem("language") : null;
	changeLanguage(stored || "en");
};
