// we need a few imports from the library (TypeScript-only)
import { type Props, $, createRef } from "defuss"

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

  console.log("[Counter] Creating VDOM", ref)

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
  }

  const onMount = () => {
    console.log("[Counter] onMount", buttonRef)
  }

  const onMouseDownCapture = (evt: PointerEvent) => {
    console.log("[Counter] Mouse down capture", evt)
  }

  // Already when your code builds, this JSX is turned into a virtual DOM.
  // At runtime, the virtual DOM is rendered and displayed in the browser.
  // It usually is pre-rendered (SSR) on server-side and hydrated in the browser.
  return (
    <button type="button" ref={buttonRef} onClick={onUpdateLabel} onMount={onMount} onMouseDownCapture={onMouseDownCapture}>
      {/* This label is rendered *once*. It will never change reactively! */}
      {/* Only with *explicit* code, will the content of this <button> change. */}
      {renderLabel(clickCount, label)}
    </button>
  )
}