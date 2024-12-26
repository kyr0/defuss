// store.ts
import { getByPath, setByPath } from '@/common/index.js';

export type Listener<T> = (newValue: T, oldValue?: T, changedKey?: string) => void;

export interface Store<T> {
  value: T; // axpose the current value for type compliance
  get: (path?: string) => any;
  set: (pathOrValue: string | any, value?: any) => void;
  subscribe: (listener: Listener<T>) => () => void;
}

export const createStore = <T>(initialValue: T): Store<T> => {
  let value: T = initialValue; // internal state
  const listeners: Array<Listener<T>> = [];

  const notify = (oldValue: T, changedKey?: string) => {
    listeners.forEach(listener => listener(value, oldValue, changedKey));
  };

  return {
    // allow reading value but prevent external mutation
    get value() {
      return value; 
    },

    get(path?: string) {
      return path ? getByPath(value, path) : value;
    },

    set(pathOrValue: string | any, newValue?: any) {
      const oldValue = value;

      if (newValue === undefined) {
        // Replace entire store value
        if (oldValue !== pathOrValue) {
          value = pathOrValue;
          notify(oldValue);
        }
      } else {
        // Update a specific path
        const updatedValue = setByPath(value, pathOrValue, newValue);
        if (oldValue !== updatedValue) {
          value = updatedValue;
          notify(oldValue, pathOrValue);
        }
      }
    },

    subscribe(listener) {
      listeners.push(listener);
      listener(value); // immediate notification
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
};
