import type { VNode } from "../render/types.js";
import { createStore, type Store } from "../store/index.js";

export type Resolve<T> = T extends infer U ? U : never;

export type TranslationKeys<T, Prefix extends string = ""> = Resolve<{ 
	[K in keyof T]:
	T[K] extends Record<string, unknown>
		? TranslationKeys<T[K], `${Prefix}${K & string}.`>
		: `${Prefix}${K & string}`;
}[keyof T]>;

export type TranslationObject = {
  [key: string]: string | VNode | TranslationObject;
};

export type Translations = { [language: string]: TranslationObject };
export type OnLanguageChangeListener = (newLanguage: string) => void;
export type Replacements = Record<string, string>;

export interface I18nStore<K extends string = string> {
  language: string;
  changeLanguage: (language: string) => void;
  t: (path: K, options?: Record<string, string>) => string;
  loadLanguage: (language: string, translations: TranslationObject) => void;
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

export const createI18n = <K extends string>(): I18nStore<K> => {
  const translationsStore: Store<Translations> = createStore({});
  let language = "en";

  const onLanguageChangeCallbacks: Array<OnLanguageChangeListener> = [];

  const api = {
    get language() {
      return language;
    },

    changeLanguage: (newLanguage: string): void => {
      // Only trigger callbacks if the language actually changes
      if (newLanguage !== language) {
        language = newLanguage;
        onLanguageChangeCallbacks.forEach((callback) => {
          callback(newLanguage);
        });
      }
    },

    // example usage of the t function with placeholders:
    // const translatedString = t('greeting', { name: 'John', age: '30' }, 'common');
    // this would replace placeholders {name} and {age} in the translation string with 'John' and '30' respectively.
    t: (path: K, replacements: Record<string, string> = {}): string => {
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

    loadLanguage: (
      newLanguage: string,
      namespaceTranslations: TranslationObject,
    ): void => {
      translationsStore.set(newLanguage, {
        ...translationsStore.get<TranslationObject>(newLanguage),
        ...namespaceTranslations,
      });
      // Only notify subscribers if the new language is the current language
      if (newLanguage === language) {
        onLanguageChangeCallbacks.forEach((callback) => {
          callback(language);
        });
      }
    },

    subscribe(onLanguageChange: OnLanguageChangeListener) {
      onLanguageChangeCallbacks.push(onLanguageChange);
      return () => api.unsubscribe(onLanguageChange);
    },

    unsubscribe(onLanguageChange: OnLanguageChangeListener) {
      const index = onLanguageChangeCallbacks.indexOf(onLanguageChange);
      if (index >= 0) onLanguageChangeCallbacks.splice(index, 1);
    },
  };
  return api;
};

if (!globalThis.__defuss_i18n) {
  globalThis.__defuss_i18n = createI18n();
}

/**
 * @deprecated Use `createI18n` instances with typed keys instead of the default singleton.
 */
export const i18n = globalThis.__defuss_i18n;

/**
 * @deprecated Use `createI18n` instances with typed keys instead of the default singleton.
 */
export const t = i18n.t;

/**
 * @deprecated Use `createI18n` instances with typed keys instead of the default singleton.
 */
export const changeLanguage = i18n.changeLanguage

/**
 * @deprecated Use `createI18n` instances with typed keys instead of the default singleton.
 */
export const loadLanguage = i18n.loadLanguage;

/**
 * @deprecated Use `createI18n` instances with typed keys instead of the default singleton.
 */
export const getLanguage = () => i18n.language;
