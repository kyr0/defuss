/**
 * There are three kinds of lifecycle events:
 * - mount: when the component is mounted to the DOM
 * - unmount: when the component is unmounted from the DOM (when removed from the parent DOM element)
 * - error: when an error occurs in the component (either synchronous or asynchronous, even when an error happens 
 *   in an event listener registered in a component using either lifecycle or on* DOM events)
 */


// either a component function reference or a component key can identify a lifecycle listener 
export type LifecycleListenerIndex = Function | string | null | undefined;

export interface LifecycleFunction<T> extends Function {
  (data: T): void;
  // either a key to a DOM element/component or the component function reference
  __cmpIdx?: LifecycleListenerIndex; 
}

// stores the lifecycle callbacks for each component function
export const lifecycleCallbacks = {
  // the index of the map is either a component function reference if the listener is listening to all instances of the component
  // or a string that is a combination of the component function name and a key if the listener is listening to a specific instance of the component
  errorCallbacks: new Map<LifecycleListenerIndex, Array<LifecycleFunction<unknown>>>(),
  mountCallbacks: new Map<LifecycleListenerIndex, Array<LifecycleFunction<HTMLElement>>>(),
  unmountCallbacks: new Map<LifecycleListenerIndex,  Array<LifecycleFunction<HTMLElement>>>(),

  // to observe unmount events, we use an efficient MutationObserver to listen to the parent node of each DOM element that is controlled
  // by a defuss component function
  unmountMutationObservers: new Map<Node, MutationObserver>(),
}

// looks up the lifecycle listeners for a given component function or a specific instance of the component function
// so that every of them can be called when necessary (notification stage) 
export const findLifecycleListeners = <T>(
  map: Map<LifecycleListenerIndex, Array<LifecycleFunction<T>>>, 
  index: LifecycleListenerIndex): 
Array<LifecycleFunction<T>> => {

  for (const [_index, listeners] of map) {
    if (index === _index && listeners.length) {
      return listeners;
    }
  }
  return [];
}

export const getLifecycleIndex = (cmpFn: Function, key?: string) => {
  if (typeof key === "string") {
    return key;
  } 
  if (typeof cmpFn === "function" ) {
    return cmpFn;
  }
  return null;
}

// --- onError ---

export const formatInteractionError = (error: unknown, caller: Function) => {
  if (typeof error === "string") {
    error = `[InteractionError] in ${caller?.name || 'unknown function'}: ${error}`;
  } else if (error instanceof Error) {
    error.message = `[InteractionError] in ${caller?.name || 'unknown function'}: ${error.message}`;
  }
  return error
}

export const createErrorBoundaryCallback = (fn: Function, caller: Function, key?: string) => (evt: Event) => {
  try {
    // wrap synchronous execution of the handler (call through)
    // see: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#the_event_listener_callback
    const result = fn(evt);

    // defuss accepts async event handlers because the developer is able and advised to
    // take active control over event.preventDefault() in the function body,
    // therefore the synchronous return value of an async function, being a Promise,
    // will be truthy and browser default behaviour remains nominal
    // while the developer still is in control over alternative logic flow
    if (result instanceof Promise) {
      // in order to catch async errors however, we need to implement .catch()
      return result.catch((error) => {
 
        // specific, instance-bound error listeners
        if (key) {
          notifyErrorOccurred(formatInteractionError(error, caller), key);
        }

        // global error listeners
        notifyErrorOccurred(formatInteractionError(error, caller), caller);
      }); // returns the Promise
    }

    // event handlers expect a return value; it has an impact on how the DOM behaves regarding its default behaviour
    // (e.g. event.preventDefault() in case a falsy scalar value is returned)
    return result; 
  } catch (error) {

    // specific, instance-bound error listeners
    if (key) {
      notifyErrorOccurred(formatInteractionError(error, caller), key);
    }

    // global error listeners
    notifyErrorOccurred(formatInteractionError(error, caller), caller);
  }
};

export const onError = (cb: LifecycleFunction<unknown>, index: LifecycleListenerIndex) => {
  cb.__cmpIdx = index; // backreference to the component function
  const currentErrorListenersForThisIndex = findLifecycleListeners<unknown>(lifecycleCallbacks.errorCallbacks, index)
  lifecycleCallbacks.errorCallbacks.set(index, [...currentErrorListenersForThisIndex, cb]);
};

export const notifyErrorOccurred = (error: unknown, index: LifecycleListenerIndex) => {

  const currentErrorListenersForThisIndex = findLifecycleListeners<unknown>(lifecycleCallbacks.errorCallbacks, index)

  for (const cb of currentErrorListenersForThisIndex) {

    if (typeof cb.__cmpIdx === "function") {
      // @ts-ignore: assigning the latest error so that the renderer can print "FATAL ERROR" in subtree
      cb.__cmpIdx._error = error;
    }

    // TODO: dereference "key"/string case and assign _error

    // calling the error boundary callback passed in by the developer
    cb(error)
  }
}

// --- onMount ---

export const onMount = (cb: LifecycleFunction<HTMLElement>, index: LifecycleListenerIndex) => {
  console.log('PRE onMount', index)
  cb.__cmpIdx = index; // backreference to the component function
  const currentMountListenersForThisIndex = findLifecycleListeners<HTMLElement>(lifecycleCallbacks.mountCallbacks, index)

  console.log('MID onMount currentMountListenersForThisIndex', currentMountListenersForThisIndex)
  lifecycleCallbacks.mountCallbacks.set(index, [...currentMountListenersForThisIndex, cb]);

  console.log('POST onMount', index, lifecycleCallbacks.mountCallbacks)
};

export const notifyMounted = (domElement: HTMLElement, index: LifecycleListenerIndex) => {
  const listeners = findLifecycleListeners<HTMLElement>(lifecycleCallbacks.mountCallbacks, index);
  console.log('notifyMounted in LIFECYCLE', domElement.nodeName, index, listeners)
  for (const cb of listeners) {
    cb(domElement)
  }
}

// --- onUnmount ---

export const observeUnmount = (domNode: Node, onUnmount: () => void): void => {
  if (!domNode || typeof onUnmount !== 'function') {
    throw new Error('Invalid arguments. Ensure domNode and onUnmount are valid.');
  }

  const parentNode = domNode.parentNode;
  if (!parentNode) {
    throw new Error('The provided domNode does not have a parentNode.');
  }

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes.length > 0) {
        for (const removedNode of mutation.removedNodes) {
          if (removedNode === domNode) {
            onUnmount();
            observer.disconnect(); // Stop observing after unmount
            return;
          }
        }
      }
    }
  });

  // Observe the parentNode for child removals
  observer.observe(parentNode, { childList: true });
}

export const onUnmount = (cb: LifecycleFunction<HTMLElement>, index: LifecycleListenerIndex) => {
  cb.__cmpIdx = index; // backreference to the component function
  const currentUnmountListenersForThisIndex = findLifecycleListeners<HTMLElement>(lifecycleCallbacks.unmountCallbacks, index)
  lifecycleCallbacks.unmountCallbacks.set(index, [...currentUnmountListenersForThisIndex, cb]); // add another listener to the list
};

export const onElementUnmount = (el: HTMLElement, cmpFn: Function) => {
  observeUnmount(el, () => cmpFn(el));
}

export const notifyOnUnmount = (el: HTMLElement, index: LifecycleListenerIndex) => {
  if (!lifecycleCallbacks.unmountMutationObservers.has(el)) {
    observeUnmount(el, () => notifyUnmounted(el, index));
  }
}

export const notifyUnmounted = (el: HTMLElement, index: LifecycleListenerIndex) => {
  const listeners = findLifecycleListeners<HTMLElement>(lifecycleCallbacks.unmountCallbacks, index);
  for (const cb of listeners) {
    cb(el)
  }
}