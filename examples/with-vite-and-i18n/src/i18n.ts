import {createI18n, createTrans, TranslationKeys} from "defuss";
import de from "../i18n/de.json";
import en from "../i18n/en.json";

export type Keys = TranslationKeys<typeof en>

//use custom instance with types
export const i18n = createI18n<Keys>()
export const { language, changeLanguage, loadLanguage, t, subscribe, unsubscribe } = i18n;
export const T = createTrans(i18n)

loadLanguage("en", en);
loadLanguage("de", de);
changeLanguage("de");

