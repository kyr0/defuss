import type { PersistenceProviderType } from "../webstorage/index.js";
import { $ } from "../dequery/dequery.js";
import type {
  DOMElement,
  NodeType,
  Ref,
  RefUpdateFn,
  RefUpdateRenderFnInput,
} from "../render/types.js";
import { createStore } from "../store/store.js";

export const isRef = <
  NT extends Node | Element | Text | null = HTMLElement,
  ST = any,
>(
  obj: any,
): obj is Ref<NT, ST> =>
  Boolean(obj && typeof obj === "object" && "current" in obj);

export function createRef<NT extends DOMElement = DOMElement, ST = any>(refUpdateFn?: RefUpdateFn<ST>, defaultState?: ST): Ref<NT, ST> {
  const stateStore = createStore<ST>(defaultState as ST);

  const render = async (input: RefUpdateRenderFnInput, ref: Ref<NT, ST>) => await $<NodeType>(ref.current).update(input);

  const ref: Ref<NT, ST> = {
    current: null as unknown as NT,
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
    render: async (input: RefUpdateRenderFnInput) => render(input, ref),
    update: async (input: RefUpdateRenderFnInput) => render(input, ref),
    subscribe: (refUpdateFn: RefUpdateFn<ST>) =>
      stateStore.subscribe(refUpdateFn),
  };

  if (typeof refUpdateFn === "function") {
    ref.subscribe(refUpdateFn);
  }
  return ref;
}
