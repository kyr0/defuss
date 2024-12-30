import type { VNode } from '@/render/types.js';
import { createStore, type Store } from '@/store/index.js';

export type TranslationObject = { [key: string]: string|VNode|TranslationObject };
export type Translations = { [language: string]: TranslationObject };
export type OnLanguageChangeListener = (newLanguage: string) => void;
export type Replacements = Record<string, string>;

export interface I18nStore {
  language: string;
  changeLanguage: (language: string) => void;
  t: (path: string, options?: Record<string, string>) => string;
  load: (language: string, translations: TranslationObject) => void;
  subscribe: (onLanguageChange: OnLanguageChangeListener) => void;
}

// example of placeholders: {name}, {age}, {city}
const VARIABLE_REGEX = /{([^}]*)}/g;

const interpolate = (template: string, replacements: Replacements): string =>
  template.replace(VARIABLE_REGEX, (_, key) => replacements[key] || `{${key}}`);

export const createI18n = (): I18nStore => {
  const translationsStore: Store<Translations> = createStore({});
  let language = 'en';

  const getTranslation = (key: string): string => {
    const translation = translationsStore.get<string>(`${language}.${key}`);
    return translation || key;
  };
  const onLanguageChangeCallbacks: Array<OnLanguageChangeListener> = [];

  return {
    language,

    changeLanguage(newLanguage: string) {
      language = newLanguage;
      onLanguageChangeCallbacks.forEach(callback => callback(newLanguage));
    },

    // example usage of the t function with placeholders:
    // const translatedString = t('greeting', { name: 'John', age: '30' }, 'common');
    // this would replace placeholders {name} and {age} in the translation string with 'John' and '30' respectively.
    t(path: string, replacements: Record<string, string> = {}) {
      const template = getTranslation(path);

      // VDOM (VNode)
      if (typeof template !== 'string') {
        return template;
      }
      // plaintext string or HTML
      return interpolate(template, replacements);
    },

    load(newLanguage: string, namespaceTranslations: TranslationObject) {
      translationsStore.set(newLanguage, {
        ...translationsStore.get<TranslationObject>(newLanguage),
        ...namespaceTranslations,
      });
    },

    subscribe(onLanguageChange: OnLanguageChangeListener) {
      onLanguageChangeCallbacks.push(onLanguageChange);
      return () => {
        const index = onLanguageChangeCallbacks.indexOf(onLanguageChange);
        if (index >= 0) onLanguageChangeCallbacks.splice(index, 1);
      };
    }
  };
};


// export singleton
export const i18n = createI18n();
