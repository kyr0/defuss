import type { Ref, RefUpdateFn } from '@/render/types.js';
import { createStore } from '@/store/store.js';

export const isRef = (obj: any): obj is Ref<Element> =>
  obj && typeof obj === "object" && "current" in obj;

export function createRef<ST = any, NT extends Node | Element | Text | null = HTMLElement>(refUpdateFn?: RefUpdateFn<ST>, defaultState?: ST): Ref<NT, ST> {

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
    update: (state: ST) => {
      stateStore.set(state);
    },
    subscribe: (refUpdateFn: RefUpdateFn<ST>) => stateStore.subscribe(refUpdateFn),
  }

  if (typeof refUpdateFn === 'function') {
    ref.subscribe(refUpdateFn);
  }
  return ref;
}