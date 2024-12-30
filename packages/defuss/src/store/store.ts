// store.ts
import { getByPath, setByPath } from '@/common/index.js';

export type Listener<T> = (newValue: T, oldValue?: T, changedKey?: string) => void;

export interface Store<T> {
  value: T;
  get: <D=T>(path?: string) => D;
  set: <D=T>(pathOrValue: string | D, value?: D) => void;
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
        // replace entire store value
        if (oldValue !== pathOrValue) {
          value = pathOrValue;
          notify(oldValue);
        }
      } else {
        // update a specific path
        const updatedValue = setByPath(value, pathOrValue, newValue);
        if (oldValue !== updatedValue) {
          value = updatedValue;
          notify(oldValue, pathOrValue);
        }
      }
    },

    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
};
