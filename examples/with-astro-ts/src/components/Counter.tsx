import "./Counter.css"

// we need a few imports from the library (TypeScript-only)
import { type Props, $, createRef, onError, onMount, onUnmount, dequery } from "defuss"


// When using TypeScript, interfaces come in handy
// They help with good error messages!
export interface CounterProps extends Props {

  // what the button displays
  label: string;

  // current click counter
  clickCount: number;
}

const renderLabel = (clickCount: number, defaultLabel: string) => {
  return clickCount ? `Count is: ${clickCount}` : defaultLabel
}

// Component functions are called once! 
// No reactivity means *zero* complexity!
export function Counter({ label, ref, clickCount }: CounterProps) {

  onError((err) => {

    console.log("[Counter] Error boundary caught an error", err)
    $(buttonRef).html(<strong>Sorry, an error happened!</strong>);
  
  }, Counter);

  onMount(async(el: HTMLElement) => {
    console.log("[Counter] onMount NEW", !!el, !!ref.current)
  }, Counter);

  onUnmount((el: HTMLElement) => {
    console.log("[Counter] onUnmount Component NEW", !!el, !!ref.current)
  }, Counter);


  console.log("[Counter] Creating VDOM", !!ref)

  // References the DOM element once it becomes visible.
  // When it's gone, the reference is gone. Easy? Yeah.
  const buttonRef = createRef()

  // A native event handler. Called when the user clicks on the button.
  // Receives the native DOMs MouseEvent. No magic here either!
  const onUpdateLabel = async(evt: MouseEvent) => {

    // just increment the counter variable on click. Easy? Yeah.
    clickCount++;

    console.log("[Counter] onUpdateLabel: Native mouse event", evt)

    // Changes the innerText of the <button> element.
    // You could also do: buttonRef.current.innerText = `...`
    // but dequery works like jQuery and is much simpler!
    $(buttonRef).text(renderLabel(clickCount, label))

    // inform the parent component about the click counter update
    ref.update(clickCount)

    dequery(buttonRef).tap((el) => {
      console.log("[Counter11] Clicked on button", el)
    }).remove();

    //throw new Error("asd")
  }

  const whenMounted = () => {
    console.log("[Counter] onMount")
  }

  const whenUnmounted = () => {
    console.log("[Counter] onUnmount button")
  }

  const whenMouseDownCapture = (evt: PointerEvent) => {
    console.log("[Counter] Mouse down capture", evt)
  }

  // Already when your code builds, this JSX is turned into a virtual DOM.
  // At runtime, the virtual DOM is rendered and displayed in the browser.
  // It usually is pre-rendered (SSR) on server-side and hydrated in the browser.
  return (
    <button class="Counter" type="button" 
      ref={buttonRef} onClick={onUpdateLabel} 
      onUnmount={whenUnmounted} onMount={whenMounted} 
      onMouseDownCapture={whenMouseDownCapture}
    >
      {/* This label is rendered *once*. It will never change reactively! */}
      {/* Only with *explicit* code, will the content of this <button> change. */}
      {renderLabel(clickCount, label)}
    </button>
  )
}