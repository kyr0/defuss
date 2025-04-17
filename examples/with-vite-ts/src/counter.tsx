// we need a few imports from the library (TypeScript-only)
import { type Props, createRef, $ } from "defuss"
import { Async } from "defuss-ui"

// When using TypeScript, interfaces come in handy
// They help with good error messages!
export interface CounterProps extends Props {

  // what the button displays
  label: string;
}

// renders 1 sec after initial render
// and 500ms after the last <Async /> render (<Counter />)
export async function Later() {

  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnRef = createRef()

  const didClick = () => {
    try {
      console.log("later click")
      throw new Error("Later click error")
    } catch(e) {
      $(btnRef).update(<strong>Catching async errors works!</strong>);
    }
  }

  return (
    <button type="button" onUnmount={() => {
      console.log("[Later] in onUnmount Later")
    }} ref={btnRef} onClick={didClick}>Very much later</button>
  )
}

// all Component functions are called once! 
// No reactivity means *zero* complexity!
export async function AsyncCounter({ label }: CounterProps) {

  // delays rendering by 500ms as the Promise resolves after the timeout
  await new Promise((resolve) => setTimeout(resolve, 500))

  // References the DOM element once it becomes visible.
  // They are also used to carry state. This way, a parent component can sync its state with a child component.
  const countButtonRef = createRef<number>();
  const containerRef = createRef() 
  

  const handleError = (e: unknown) => {
    console.error("Counter error", e)
    $(countButtonRef).update(<strong>Catching sync error works!</strong>);
  }

  // A vanilla JavaScript variable. No magic here!
  let clickCounter = 0

  // A native event handler. Called when the user clicks on the button.
  // Receives the native DOMs MouseEvent. No magic here either!
  const updateLabel = (evt: MouseEvent) => {
    try {

      // just increment the counter variable on click. Easy? Yeah.
      clickCounter++;

      console.log("updateLabel: Native mouse event", evt)

      // Changes the innerText of the <button> element.
      // You could also do: buttonRef.current.innerText = `...`
      // but dequery works like jQuery and is much simpler!
      $(countButtonRef).update(`Count is: ${clickCounter}`)

      console.log("updateLabel: Button text updated", clickCounter)
      //asyncRef.update("loaded")

      // sync to external state
      countButtonRef.update(clickCounter)

      // re-render the <Later /> component
      $(containerRef).update(
        <Async ref={containerRef} fallback={<div>Loading later...</div>}>
          <div>Async content</div>
          <Later />
        </Async>
      )

      if (clickCounter === 3) {
        console.error("Catching sync errors works!")
        throw new Error("Catching sync errors works!")
      }
    } catch(e) {
      handleError(e)
    }
  }

  const handleMount = () => {
    console.log("Counter mounted")
  }

  const handleUnmount = () => {
    console.log("Counter unmounted")
  }

  // Already when your code builds, this JSX is turned into a virtual DOM.
  // At runtime, the virtual DOM is rendered and displayed in the browser.
  // It usually is pre-rendered (SSR) on server-side and hydrated in the browser.
  return (
    <div class="counter-root" onMount={handleMount} onUnmount={handleUnmount}>
      <button type="button" ref={countButtonRef} onClick={updateLabel}>
        {/* This label is rendered *once*. It will never change reactively! */}
        {/* Only with *explicit* code, will the content of this <button> change. */}
        {label}
      </button>
      <div ref={containerRef}>
        <Async onError={handleError} fallback={<div>Loading later...</div>}>
          <div>Async content</div>
          <Later />
        </Async>
      </div>
    </div>
  )
}