import type { Ref, RefUpdateFn } from '@/render/types.js';

export const isRef = (obj: any): obj is Ref<Element> =>
  obj && typeof obj === "object" && "current" in obj;

export function createRef<T extends Node | Element | Text | null = null, D = any>(refUpdateFn?: RefUpdateFn<D>, defaultState?: D): Ref<T, D> {
  const ref: Ref<T, D> = { 
    $subscriberFns: [],
    current: null as T,
    state: defaultState,
    update: (state: D) => {
      ref.state = state;
      ref.$subscriberFns.forEach(fn => fn(state));
    },
    subscribe: (refUpdateFn: RefUpdateFn<D>) => {
      ref.$subscriberFns.push(refUpdateFn);
      // unsubscribe function
      return () => {
        const index = ref.$subscriberFns.indexOf(refUpdateFn);
        if (index !== -1) {
          ref.$subscriberFns.splice(index, 1);
        }
      }
    },
  }

  if (typeof refUpdateFn === 'function') {
    ref.subscribe(refUpdateFn);
  }
  return ref;
}