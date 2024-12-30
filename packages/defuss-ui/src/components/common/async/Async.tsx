import type { Props, Ref, RenderInput, VNode, VNodeChildren } from "defuss/jsx-runtime"
import { createRef, dequery, isRef, onError, inDevMode } from "defuss";
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

export const Async = ({ 
  fallback, ref, children, class: _class, className, id, loadingClassName, loadedClassName, errorClassName
}: AsyncProps) => {

  let childrenToRender: VNodeChildren | undefined = children;

  const containerRef: AsyncStateRef = createRef<AsyncState>(function onSuspenseUpdate(state: AsyncState) {

    if (!containerRef.current) {
      if (inDevMode) {
        console.warn("Suspense container is not mounted yet, but a state update demands a render. State is:", state);
      }
      return;
    }

    // to allow for beautiful CSS state transitions
    dequery(containerRef.current).removeClass(loadingClassName || "suspense-loading");
    dequery(containerRef.current).removeClass(loadedClassName || "suspense-loaded");
    dequery(containerRef.current).removeClass(errorClassName || "suspense-error");

    if (!children || state === 'error') {
      dequery(containerRef.current).addClass(errorClassName || "suspense-error");
      dequery(containerRef).jsx(<div>Loading error!</div>);
    } else if (state === 'loading') {
      dequery(containerRef.current).addClass(loadingClassName || "suspense-loading");
      dequery(containerRef).jsx(fallback);
    } else if (state === 'loaded') {
      dequery(containerRef.current).addClass(loadedClassName || "suspense-loaded");

      console.log("[Async render] start")
      dequery(containerRef).jsx(childrenToRender as RenderInput);
      console.log("[Async render] finished")
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

  // to catch internal errors
  onError((error) => {
    containerRef.update("error");
    containerRef.error = error;
  }, Async);

  // resolve async children
  const promisedChildren = (children || []).map((vnode) => {

    if (!vnode || (vnode && !(vnode as VNode).type)) {
      return Promise.resolve(''); // becomes a Text node
    }

     // <Async><SomeAsyncComponent /></Async>
    if ((vnode as VNode).type.constructor.name === 'AsyncFunction') {
      // construct the props object
      const props = { ...(vnode as VNode).attributes, children: (vnode as VNode).children };
      const promisedVdom = (vnode as VNode).type(props);

      promisedVdom.$$type = (vnode as VNode).type;

      // mapping key to $$key so that it can be passed down
      // to children (for error boundaries to capture the whole DOM element sub-tree)
      // but still not collide with the key, which can differ in children of the sub-tree
      if ((vnode as VNode).attributes?.key) {
        // TODO: unify behaviour across all variants
        promisedVdom.$$key = (vnode as VNode).attributes.key
      }
      // yield the Promise objects
      return promisedVdom;
    }

    // all the other synchronous cases
    return Promise.resolve(vnode);
  })

  const onMount = () => {

    if (promisedChildren.length) {

      containerRef.update("loading");

      Promise.all(promisedChildren.map((promise) => 
        promise.then((vnode: VNode) => ({ vnode, promise }))
      )).then((correlatedResults) => {

        childrenToRender = correlatedResults.map(result => {
          // store the function reference for error tracking (error boundary scoping
          if (result.vnode && result.promise && typeof result.promise.$$type === 'function') {
            result.vnode.$$type = result.promise.$$type
          }

          // ensure to store the key for instance-based lifecycle event listener registration
          if (result.vnode && result.promise && result.vnode.attributes && typeof result.promise.$$key === "string") {
            result.vnode.attributes.$$key = result.promise.$$key
          }
          return result.vnode;
        });

        console.log("childrenToRender", childrenToRender)
        childrenToRender = childrenToRender.flatMap((vnode: any) => {
          if (vnode?.type === 'Fragment') {
            return vnode.children;
          }
          return vnode;
        });
        containerRef.update("loaded");

      }).catch((error) => {

        containerRef.update("error");
        containerRef.error = error;
        
        if (inDevMode) { // only in development mode
          console.error("SuspenseLoadingError", error);
        }
        dequery(containerRef).jsx(`SuspenseLoadingError: ${error}`);
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