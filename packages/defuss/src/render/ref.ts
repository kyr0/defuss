import type { PersistenceProviderType } from "../webstorage/index.js";
import { $ } from "../dequery/dequery.js";
import type {
  NodeType,
  Ref,
  RefUpdateFn,
  RefUpdateRenderFnInput,
} from "../render/types.js";
import { createStore } from "../store/store.js";

export const isRef = (obj: any): obj is Ref<Element> =>
  Boolean(obj && typeof obj === "object" && "current" in obj);

export function createRef<
  ST = any,
  NT extends Node | Element | Text | null = HTMLElement,
>(refUpdateFn?: RefUpdateFn<ST>, defaultState?: ST): Ref<NT, ST> {
  const stateStore = createStore<ST>(defaultState as ST);

  const ref: Ref<NT, ST> = {
    current: null as NT,
    store: stateStore,
    get state() {
      return stateStore.value;
    },
    set state(value: ST) {
      stateStore.set(value);
    },
    persist: (key: string, provider: PersistenceProviderType = "local") => {
      stateStore.persist(key, provider);
    },
    restore: (key: string, provider: PersistenceProviderType = "local") => {
      stateStore.restore(key, provider);
    },
    updateState: (state: ST) => {
      stateStore.set(state);
    },
    update: async (input: RefUpdateRenderFnInput) =>
      await $<NodeType>(ref.current).update(input),
    subscribe: (refUpdateFn: RefUpdateFn<ST>) =>
      stateStore.subscribe(refUpdateFn),
  };

  if (typeof refUpdateFn === "function") {
    ref.subscribe(refUpdateFn);
  }
  return ref;
}
