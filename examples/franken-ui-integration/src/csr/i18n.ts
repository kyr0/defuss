import { changeLanguage, loadLanguage } from "defuss";
import de from "../../i18n/de.json";
import en from "../../i18n/en.json";

export const initI18n = () => {
    // load languages
    loadLanguage("de", de);
    loadLanguage("en", en);

    // change language to default
    changeLanguage("en");
};
