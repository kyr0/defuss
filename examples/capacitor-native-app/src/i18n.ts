import { changeLanguage, loadLanguage } from "defuss";
import de from "./i18n/de.json";
import en from "./i18n/en.json";

loadLanguage("de", de);
loadLanguage("en", en);

changeLanguage("de");
