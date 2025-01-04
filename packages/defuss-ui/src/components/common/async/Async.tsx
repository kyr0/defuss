import type { Props, Ref, RenderInput, VNode, VNodeChildren } from "defuss/jsx-runtime"
import { createRef, $, isRef, inDevMode } from "defuss";
import type { ComponentProps } from "../types.js";

export type AsyncState = 'loading' | 'loaded' | 'error'

export interface AsyncStateRef extends Ref<HTMLElement> { 
  /** The state of the async content */
  state?: AsyncState;

  /** Error details are available here in case the state changes to "error" */
  error?: unknown;
}

export interface AsyncProps extends Props, ComponentProps {
  /** The fallback content to display while the async content is loading */
  fallback?: VNode;

  /** Store this with createRef() to update() the Suspense state */
  ref?: AsyncStateRef;

  /** The async content to display when loaded */
  render?: () => Promise<RenderInput>;

  /** to override the name of the .suspense-loading transition CSS class name */
  loadingClassName?: string;

  /** to override the name of the .suspense-loaded transition CSS class name */
  loadedClassName?: string;

  /** to override the name of the .suspense-error transition CSS class name */
  errorClassName?: string;
}

// TODO: Move to defuss itself
export const Async = ({ 
  fallback, ref, children, class: _class, className, id, loadingClassName, loadedClassName, errorClassName, onError
}: AsyncProps) => {

  let childrenToRender: VNodeChildren | undefined = children;

  const containerRef: AsyncStateRef = createRef<AsyncState>(function onSuspenseUpdate(state: AsyncState) {

    try {

      if (!containerRef.current) {
        if (inDevMode) {
          console.warn("Suspense container is not mounted yet, but a state update demands a render. State is:", state);
        }
        return;
      }

      // to allow for beautiful CSS state transitions
      $(containerRef.current).removeClass(loadingClassName || "suspense-loading");
      $(containerRef.current).removeClass(loadedClassName || "suspense-loaded");
      $(containerRef.current).removeClass(errorClassName || "suspense-error");

      if (!children || state === 'error') {
        $(containerRef.current).addClass(errorClassName || "suspense-error");
        $(containerRef).jsx(<div>Loading error!</div>);
      } else if (state === 'loading') {
        $(containerRef.current).addClass(loadingClassName || "suspense-loading");
        $(containerRef).jsx(fallback);
      } else if (state === 'loaded') {
        $(containerRef.current).addClass(loadedClassName || "suspense-loaded");

        console.log("[Async render] start")
        $(containerRef).jsx(childrenToRender as RenderInput);
        console.log("[Async render] finished")
      }
    } catch (error) {
      containerRef.update("error");
      containerRef.error = error;

      if (typeof onError === 'function') {
        // pass the error up to the parent component
        onError(error);
      }
    }
  }, "loading");

  if (isRef(ref)) {

    // for the initial state synchronization between outer and inner scope
    // we don't want to trigger the suspense state to render,
    // as the DOM element is not yet mounted (rendered in DOM)
    let isInitial = true;

    // when the suspense state is updated in outer scope
    // we bridge the update to the internal containerRef
    ref.update = (state: AsyncState) => {
      if (!isInitial) {
        containerRef.update(state);
      }
    }
    // let's tell the outer scope the initial state
    ref.update("loading");

    isInitial = false; // render any outer scope updates from now on
  }

  // resolve async children
  const promisedChildren = (children || []).map((vnode) => {

    try {
      if (!vnode || (vnode && !(vnode as VNode).type)) {
        return Promise.resolve(''); // becomes a Text node
      }

      // <Async><SomeAsyncComponent /></Async>
      if ((vnode as VNode).type.constructor.name === 'AsyncFunction') {
        // construct the props object
        const props = { ...(vnode as VNode).attributes, children: (vnode as VNode).children };
        // yield the Promise objects
        return (vnode as VNode).type(props);
      }

      // all the other synchronous cases
      return Promise.resolve(vnode);
    } catch (error) {
      containerRef.update("error");
      containerRef.error = error;

      if (typeof onError === 'function') {
        // pass the error up to the parent component
        onError(error);
      }
    }
  })

  const onMount = () => {

    if (promisedChildren.length) {

      containerRef.update("loading");

      Promise.all(promisedChildren)
        .then((awaitedVnodes) => {
          childrenToRender = awaitedVnodes.flatMap((vnode: VNode) =>
            vnode?.type === 'Fragment' ? vnode.children : vnode
          );
          containerRef.update("loaded");
        })
        .catch((error) => {
          containerRef.update("error");
          containerRef.error = error;

          if (inDevMode) {
            console.error("SuspenseLoadingError", error);
          }
          $(containerRef).jsx(`SuspenseLoadingError: ${error}`);

          if (typeof onError === 'function') {
            onError(error);
          }
        });
    }
  }

  return {
    type: 'div',
    attributes: { id, class: _class, className, ref: containerRef, onMount },
    children: fallback ? [fallback] : []
  }
}

// React-mimicing alias
export const Suspense = Async;