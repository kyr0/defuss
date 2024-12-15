type Listener<T> = (newValue: T, oldValue?: T, changedKey?: string) => void;

export interface Store<T> {
  value: T;
  get: (path?: string) => any;
  set: (pathOrValue: string | any, value?: any) => void;
  subscribe: (listener: Listener<T>) => () => void;
  notify: (oldValue: T, changedKey?: string) => void;
  listenerCount: number;
  listen: (listener: Listener<T>) => () => void;
}

const QUEUE_ITEMS_PER_LISTENER = 4;
const listenerQueue: Array<any> = [];
let listenerQueueIndex = 0;

export let epoch = 0;

const ARRAY_INDEX = /(.*)\[(\d+)\]/;
const IS_NUMBER = /^\d+$/;

function getAllKeysFromPath(path: string): Array<string | number> {
  return path.split('.').flatMap(key => getKeyAndIndicesFromKey(key));
}

function getKeyAndIndicesFromKey(key: string): Array<string | number> {
  if (ARRAY_INDEX.test(key)) {
    const [, keyPart, index] = key.match(ARRAY_INDEX)!;
    return [...getKeyAndIndicesFromKey(keyPart), Number.parseInt(index, 10)];
  }
  return [key];
}

function ensureKey(obj: Record<string, any>, key: string | number, nextKey?: string | number): void {
  if (key in obj) {
    return;
  }

  if (IS_NUMBER.test(String(nextKey))) {
    obj[key] = Array(Number(nextKey) + 1);
  } else {
    obj[key] = {};
  }
}

function setByKey(obj: any, keys: Array<string | number>, value: any): any {
  const key = keys[0];
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };

  if (keys.length === 1) {
    if (value === undefined) {
      if (Array.isArray(copy)) {
        copy.splice(Number(key), 1);
      } else {
        delete copy[key];
      }
    } else {
      copy[key] = value;
    }
    return copy;
  }

  ensureKey(copy, key, keys[1]);
  copy[key] = setByKey(copy[key], keys.slice(1), value);
  return copy;
}

export const store = <T>(initialValue: T): Store<T> => {
  const listeners: Array<Listener<T>> = [];

  const $store: Store<T> = {
    value: initialValue,

    get(path?: string) {
      if (!$store.listenerCount) {
        $store.listen(() => {})();
      }

      if (!path) {
        return $store.value;
      }

      const keys = getAllKeysFromPath(path);
      return keys.reduce((obj, key) => (obj == null ? undefined : obj[key]), $store.value);
    },

    set(pathOrValue: string | any, value?: any) {
      if (value === undefined) {
        // No `value` provided: update the entire store value
        const oldValue = $store.value;
        if (oldValue !== pathOrValue) {
          $store.value = pathOrValue;
          $store.notify(oldValue);
        }
      } else {
        // `value` provided: update a nested path
        const path = pathOrValue as string;
        const keys = getAllKeysFromPath(path);
        const oldValue = $store.get(path);
        $store.value = setByKey($store.value, keys, value);
        $store.notify(oldValue, path);
      }
    },

    subscribe(listener) {
      const unsubscribe = $store.listen(listener);
      listener($store.value); // subscribing means listening plus immediate notification
      return unsubscribe;
    },

    listen(listener) {
      $store.listenerCount = listeners.push(listener);

      return () => {
        for (let i = listenerQueueIndex + QUEUE_ITEMS_PER_LISTENER; i < listenerQueue.length; ) {
          if (listenerQueue[i] === listener) {
            listenerQueue.splice(i, QUEUE_ITEMS_PER_LISTENER);
          } else {
            i += QUEUE_ITEMS_PER_LISTENER;
          }
        }

        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
          $store.listenerCount--;
        }
      };
    },

    notify(oldValue, changedKey) {
      epoch++;
      const runListenerQueue = !listenerQueue.length;

      for (const listener of listeners) {
        listenerQueue.push(listener, $store.value, oldValue, changedKey);
      }

      if (runListenerQueue) {
        for (listenerQueueIndex = 0; listenerQueueIndex < listenerQueue.length; listenerQueueIndex += QUEUE_ITEMS_PER_LISTENER) {
          listenerQueue[listenerQueueIndex](
            listenerQueue[listenerQueueIndex + 1],
            listenerQueue[listenerQueueIndex + 2],
            listenerQueue[listenerQueueIndex + 3]
          );
        }
        listenerQueue.length = 0;
      }
    },

    listenerCount: 0,
  };

  return $store;
};
