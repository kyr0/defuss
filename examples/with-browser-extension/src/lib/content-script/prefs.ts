import { createStore } from "defuss";
import { getNamespacedKey } from "./utils";

export const prefPerPage = <T>(key: string, defaultValue?: T) => {
  const nsKey = getNamespacedKey(key);
  const store = createStore<T>(defaultValue as T);
  store.restore(nsKey, "local");
  store.persist(nsKey, "local");
  return {
    get: (): T => store.value,
    set: (value: T) => store.set(value),
  };
};

// async chrome extension storage-synced prefs, connected to worker
export const prefChrome = <T>(key: string, defaultValue?: T) => {
  async function setValue(key: string, value: any, local = true) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "set", text: JSON.stringify({ key, value, local }) },
        (response) => {
          if (response.success) {
            console.log("pref value was set", key, value, response);
            resolve(key);
          } else {
            reject(`pref value was not set for key: ${key}`);
          }
        },
      );
    });
  }

  async function getValue(key: string, local = true) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "get", text: JSON.stringify({ key, local }) },
        (response) => {
          if (response.success) {
            try {
              const value = JSON.parse(response.value);
              console.log("pref value was retrieved", key, value);
              resolve(value);
            } catch (error) {
              resolve(defaultValue);
            }
          } else {
            reject(`pref could not get value for key: ${key}`);
          }
        },
      );
    });
  }
  return {
    get: async (local = true): Promise<T> => {
      const v = (await getValue(getNamespacedKey(key), local)) as T;
      return typeof v === "undefined"
        ? (Promise.resolve(defaultValue) as T)
        : v;
    },
    set: async (value: T, local = true) =>
      setValue(getNamespacedKey(key), value, local),
  };
};
