import type {
  RenderInput,
  VNodeChildren,
  VNode,
  Ref,
  Props,
  VNodeChild,
} from "@/render/types.js";
import { createRef, isRef } from "@/render/index.js";
import { $ } from "@/dequery/index.js";
import { inDevMode } from "@/common/index.js";

export type AsyncState = "loading" | "loaded" | "error";

export interface AsyncStateRef extends Ref<AsyncState, HTMLElement> {
  /** The state of the async content */
  state?: AsyncState;

  /** Error details are available here in case the state changes to "error" */
  error?: unknown;
}

export interface AsyncProps extends Props {
  /** to uniquely identify the root DOM element without using a ref */
  id?: string;

  /** to identify/select the root DOM element or style it, W3C naming */
  class?: string;

  /** to identify/select the root DOM element or style it, React naming */
  className?: string;

  /** The fallback content to display while the async content is loading */
  fallback?: VNode;

  /** Store this with createRef() to update() the Suspense state */
  ref?: AsyncStateRef;

  /** to override the name of the .suspense-loading transition CSS class name */
  loadingClassName?: string;

  /** to override the name of the .suspense-loaded transition CSS class name */
  loadedClassName?: string;

  /** to override the name of the .suspense-error transition CSS class name */
  errorClassName?: string;
}

export const Async = ({
  fallback,
  ref,
  children,
  class: _class,
  className,
  id,
  loadingClassName,
  loadedClassName,
  errorClassName,
  onError,
}: AsyncProps) => {
  let childrenToRender: VNodeChild | VNodeChildren = children;

  // Cancellation token to prevent stale async updates from racing
  let updateToken = 0;

  const containerRef: AsyncStateRef = createRef<AsyncState>(
    function onSuspenseUpdate(state: AsyncState) {
      const currentToken = ++updateToken;

      if (!containerRef.current) {
        if (inDevMode) {
          console.warn(
            "Suspense container is not mounted yet, but a state update demands a render. State is:",
            state,
          );
        }
        return;
      }

      // Use .catch() on the async IIFE to properly catch async errors
      // (try/catch around an async IIFE does NOT catch async errors)
      void (async () => {
        // Chain class removals to reduce await overhead
        await $(containerRef.current)
          .removeClass(loadingClassName || "suspense-loading")
          .removeClass(loadedClassName || "suspense-loaded")
          .removeClass(errorClassName || "suspense-error");

        // Check for stale update after first await
        if (currentToken !== updateToken) return;

        if (!children || state === "error") {
          await $(containerRef.current).addClass(
            errorClassName || "suspense-error",
          );
          if (currentToken !== updateToken) return;
          await $(containerRef).jsx({
            type: "div",
            children: ["Loading error!"],
          });
        } else if (state === "loading") {
          await $(containerRef.current).addClass(
            loadingClassName || "suspense-loading",
          );
          if (currentToken !== updateToken) return;
          // Guard: fallback might be undefined, only call .jsx() if it exists
          if (fallback) {
            await $(containerRef).jsx(fallback);
          } else {
            await $(containerRef.current).empty();
          }
        } else if (state === "loaded") {
          await $(containerRef.current).addClass(
            loadedClassName || "suspense-loaded",
          );
          if (currentToken !== updateToken) return;
          await $(containerRef).jsx(childrenToRender as RenderInput);
        }
      })().catch((error) => {
        containerRef.updateState("error");
        containerRef.error = error;

        if (typeof onError === "function") {
          onError(error);
        }
      });
    },
    "loading",
  );

  if (isRef(ref)) {
    // for the initial state synchronization between outer and inner scope
    // we don't want to trigger the suspense state to render,
    // as the DOM element is not yet mounted (rendered in DOM)
    let isInitial = true;

    // Preserve the outer ref's original updateState to avoid breaking outer store state
    const outerUpdateState = ref.updateState.bind(ref);

    // when the suspense state is updated in outer scope
    // we bridge the update to the internal containerRef
    ref.updateState = (state: AsyncState) => {
      outerUpdateState(state); // call original first to keep outer .state in sync
      if (!isInitial) {
        containerRef.updateState(state);
      }
    };
    // let's tell the outer scope the initial state
    outerUpdateState("loading");

    isInitial = false; // render any outer scope updates from now on
  }

  // resolve async children
  const promisedChildren = (
    Array.isArray(children) ? children : children ? [children] : []
  ).map((vnode) => {
    try {
      if (!vnode || (vnode && !(vnode as VNode).type)) {
        return Promise.resolve(""); // becomes a Text node
      }

      // <Async><SomeAsyncComponent /></Async>
      if ((vnode as VNode).type.constructor.name === "AsyncFunction") {
        // construct the props object
        const props = {
          ...(vnode as VNode).attributes,
          children: (vnode as VNode).children,
        };
        // yield the Promise objects
        return (vnode as VNode).type(props);
      }

      // all the other synchronous cases
      return Promise.resolve(vnode);
    } catch (error) {
      containerRef.updateState("error");
      containerRef.error = error;

      if (typeof onError === "function") {
        // pass the error up to the parent component
        onError(error);
      }
      return null; // return null so Promise.all doesn't get undefined
    }
  });

  const onMount = () => {
    if (promisedChildren.length) {
      containerRef.updateState("loading");

      Promise.all(promisedChildren)
        .then((awaitedVnodes) => {
          // Filter out nulls from error catch returns before flatMap
          childrenToRender = awaitedVnodes
            .filter((vnode): vnode is VNode => vnode != null)
            .flatMap((vnode: VNode) =>
              vnode?.type === "Fragment" ? vnode.children : vnode,
            );
          containerRef.updateState("loaded");
        })
        .catch((error) => {
          containerRef.updateState("error");
          containerRef.error = error;

          if (inDevMode) {
            console.error("SuspenseLoadingError", error);
          }
          (async () => {
            await $(containerRef).jsx(`SuspenseLoadingError: ${error}`);
          })();
          if (typeof onError === "function") {
            onError(error);
          }
        });
    }
  };

  return {
    type: "div",
    attributes: { id, class: _class, className, ref: containerRef, onMount },
    children: fallback ? [fallback] : [],
  };
};

// React-mimicing alias
export const Suspense = Async;
