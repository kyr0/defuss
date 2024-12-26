// we need a few imports from the library (TypeScript-only)
import { type Props, $, createRef, onError, onMount, onUnmount } from "defuss"
import { Async, type AsyncState } from "defuss-ui"

// When using TypeScript, interfaces come in handy
// They help with good error messages!
export interface CounterProps extends Props {

  // what the button displays
  label: string;
}

// all Component functions are called once! 
// No reactivity means *zero* complexity!
export async function Counter({ label, key }: CounterProps) {

  await new Promise((resolve) => setTimeout(resolve, 500))

  console.log("[Counter] calling onError", key)

  onError((err) => {
    console.log("[Counter] Error boundary caught an error", err)
    $(ref).html(<strong>Sorry, an error happened!</strong>);
  }, key);

  onUnmount(() => {
    console.log("[Counter] in onUnmount Counter", key)
  }, key)

  onMount(() => {
    console.log("[Counter] in onMount Counter", key)
  }, key)

  // References the DOM element once it becomes visible.
  // When it's gone, the reference is gone. Easy? Yeah.
  const ref = createRef();
  const asyncRef = createRef<HTMLDivElement, AsyncState>((newState) => {
    console.log("[Counter] Suspense state changed to", newState);
  });

  // A vanilla JavaScript variable. No magic here!
  let clickCounter = 0

  // A native event handler. Called when the user clicks on the button.
  // Receives the native DOMs MouseEvent. No magic here either!
  const updateLabel = (evt: MouseEvent) => {

    // just increment the counter variable on click. Easy? Yeah.
    clickCounter++;

    console.log("updateLabel: Native mouse event", evt)

    // Changes the innerText of the <button> element.
    // You could also do: buttonRef.current.innerText = `...`
    // but dequery works like jQuery and is much simpler!
    $(ref).text(`Count is: ${clickCounter}`)

    console.log("updateLabel: Button text updated")
    //asyncRef.update("loaded")
  }

  // Already when your code builds, this JSX is turned into a virtual DOM.
  // At runtime, the virtual DOM is rendered and displayed in the browser.
  // It usually is pre-rendered (SSR) on server-side and hydrated in the browser.
  return (
    <div class="counter-root">
      <button type="button" ref={ref} onClick={updateLabel}>
        {/* This label is rendered *once*. It will never change reactively! */}
        {/* Only with *explicit* code, will the content of this <button> change. */}
        {label}
      </button>
      <Async ref={asyncRef} fallback={<div>Loading...</div>}>
        <div>Async content</div>
      </Async>
    </div>
  )
}