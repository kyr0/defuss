export const lifecycleCallbacks = {
  errorCallbacks: new Map<Function, Array<(error: unknown) => void>>(),
  mountCallbacks: new Map<Function, Array<(domElement: HTMLElement) => void>>(),
  unmountCallbacks: new Map<Function,  Array<(domElement: HTMLElement) => void>>(),

  unmountMutationObservers: new Map<Node, MutationObserver>(),
}

// --- onError ---

export const formatInteractionError = (error: unknown, caller: Function) => {
  if (typeof error === "string") {
    error = `[InteractionError] in ${caller.name}: ${error}`;
  } else if (error instanceof Error) {
    error.message = `[InteractionError] in ${caller.name}: ${error.message}`;
  }
  return error
}

export const createErrorBoundaryCallback = (fn: Function, caller: Function) => (evt: Event) => {
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
        notifyErrorOccurred(formatInteractionError(error, caller), caller);
      }); // returns the Promise
    }

    // event handlers expect a return value; it has an impact on how the DOM behaves regarding its default behaviour
    // (e.g. event.preventDefault() in case a falsy scalar value is returned)
    return result; 
  } catch (error) {
    notifyErrorOccurred(formatInteractionError(error, caller), caller);
  }
};

export const onError = (cb: (error: unknown) => void, fn: Function) => {
  lifecycleCallbacks.errorCallbacks.set(fn, [...lifecycleCallbacks.errorCallbacks.get(fn) || [], cb]);
};

export const notifyErrorOccurred = (error: unknown, _fn: Function) => {
  for (const [fn, cbs] of lifecycleCallbacks.errorCallbacks) {
    if (fn === _fn) {
      // @ts-ignore: assigning the latest error so that the renderer can print "FATAL ERROR" in subtree
      fn._error = error;

      for (const cb of cbs) {

        // calling the error boundary callback passed in by the developer
        cb(error)
      }
    }
  }
}

// --- onMount ---

export const onMount = (cb: (el?: HTMLElement) => void, fn: Function) => {
  lifecycleCallbacks.mountCallbacks.set(fn, [...lifecycleCallbacks.mountCallbacks.get(fn) || [], cb]);
};


export const notifyMounted = (domElement: HTMLElement, _fn: Function) => {
  for (const [fn, cbs] of lifecycleCallbacks.mountCallbacks) {
    if (fn === _fn) {
      for (const cb of cbs) {
        cb(domElement)
      }
    }
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

export const onUnmount = (cb: (el?: HTMLElement) => void, fn: Function) => {
  lifecycleCallbacks.unmountCallbacks.set(fn, [...lifecycleCallbacks.unmountCallbacks.get(fn) || [], cb]);
};

export const onElementUnmount = (el: HTMLElement, cb: Function) => {
  observeUnmount(el, () => cb(el));
}

export const notifyOnUnmount = (el: HTMLElement, _fn: Function) => {
  if (!lifecycleCallbacks.unmountMutationObservers.has(el)) {
    observeUnmount(el, () => notifyUnmounted(el, _fn));
  }
}

export const notifyUnmounted = (el: HTMLElement, _fn: Function) => {
  for (const [fn, cbs] of lifecycleCallbacks.unmountCallbacks) {
    if (fn === _fn) {
      for (const cb of cbs) {
        cb(el)
      }
    }
  }
}

