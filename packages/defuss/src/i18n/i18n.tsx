import type { VNode } from "../render/types.js";
import { createStore, type Store } from "../store/index.js";

export type TranslationObject = {
  [key: string]: string | VNode | TranslationObject;
};
export type Translations = { [language: string]: TranslationObject };
export type OnLanguageChangeListener = (newLanguage: string) => void;
export type Replacements = Record<string, string>;

export interface I18nStore {
  language: string;
  changeLanguage: (language: string) => void;
  t: (path: string, options?: Record<string, string>) => string;
  load: (language: string, translations: TranslationObject) => void;
  subscribe: (onLanguageChange: OnLanguageChangeListener) => () => void;
  unsubscribe: (onLanguageChange: OnLanguageChangeListener) => void;
}

// example of placeholders: {name}, {age}, {city}
const VARIABLE_REGEX = /{([^}]*)}/g;
const DOUBLE_BRACE_REGEX = /\{\{([^}]*)\}\}/g;

const interpolate = (template: string, replacements: Replacements): string => {
  // First handle double braces {{key}} pattern - these become {replacement}
  let result = template.replace(DOUBLE_BRACE_REGEX, (match, key) => {
    const replacement = replacements[key];
    if (replacement !== undefined) {
      return `{${replacement}}`;
    }
    return match;
  });

  // Then handle regular single braces {key} pattern
  result = result.replace(VARIABLE_REGEX, (match, key) => {
    const replacement = replacements[key];
    if (replacement !== undefined) {
      return replacement;
    }
    return match;
  });

  return result;
};

export const createI18n = (): I18nStore => {
  const translationsStore: Store<Translations> = createStore({});
  let language = "en";

  const onLanguageChangeCallbacks: Array<OnLanguageChangeListener> = [];

  const api = {
    get language() {
      return language;
    },

    changeLanguage(newLanguage: string) {
      console.log(
        "i18n changeLanguage called:",
        newLanguage,
        "callbacks:",
        onLanguageChangeCallbacks.length,
      );
      // Only trigger callbacks if the language actually changes
      if (newLanguage !== language) {
        language = newLanguage;
        onLanguageChangeCallbacks.forEach((callback) => {
          console.log("i18n calling callback for language change");
          callback(newLanguage);
        });
      }
    },

    // example usage of the t function with placeholders:
    // const translatedString = t('greeting', { name: 'John', age: '30' }, 'common');
    // this would replace placeholders {name} and {age} in the translation string with 'John' and '30' respectively.
    t(path: string, replacements: Record<string, string> = {}): string {
      const languageData = translationsStore.get<TranslationObject>(language);
      if (!languageData) {
        return path;
      }

      // First try to get the translation as a literal key (for keys with dots)
      let template = languageData[path];

      // If literal key doesn't exist, try nested path access
      if (template === undefined) {
        const pathParts = path.split(".");
        let current: any = languageData;
        for (const part of pathParts) {
          current = current?.[part];
          if (current === undefined) {
            break;
          }
        }
        template = current;
      }

      // If still not found, return the key itself
      if (template === undefined) {
        return path;
      }

      // VDOM (VNode) - convert to string representation
      if (typeof template !== "string") {
        return path; // Fallback to path for non-string templates
      }
      // plaintext string or HTML
      return interpolate(template, replacements);
    },

    load(newLanguage: string, namespaceTranslations: TranslationObject) {
      console.log(
        "i18n load called:",
        newLanguage,
        "translations:",
        namespaceTranslations,
        "callbacks:",
        onLanguageChangeCallbacks.length,
      );
      translationsStore.set(newLanguage, {
        ...translationsStore.get<TranslationObject>(newLanguage),
        ...namespaceTranslations,
      });
      // Only notify subscribers if the new language is the current language
      if (newLanguage === language) {
        onLanguageChangeCallbacks.forEach((callback) => {
          console.log("i18n calling callback for load");
          callback(language);
        });
      }
    },

    subscribe(onLanguageChange: OnLanguageChangeListener) {
      console.log(
        "i18n subscribe called, total callbacks will be:",
        onLanguageChangeCallbacks.length + 1,
      );
      onLanguageChangeCallbacks.push(onLanguageChange);
      return () => api.unsubscribe(onLanguageChange);
    },

    unsubscribe(onLanguageChange: OnLanguageChangeListener) {
      const index = onLanguageChangeCallbacks.indexOf(onLanguageChange);
      console.log(
        "i18n unsubscribe called, index:",
        index,
        "total callbacks before:",
        onLanguageChangeCallbacks.length,
      );
      if (index >= 0) onLanguageChangeCallbacks.splice(index, 1);
    },
  };
  return api;
};

// export singleton
globalThis.__defuss_i18n = globalThis.__defuss_i18n || createI18n();
export const i18n = globalThis.__defuss_i18n as I18nStore;
