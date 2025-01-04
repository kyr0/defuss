// we need a few imports from the library (TypeScript-only)
import { type Props, createRef, dequery, isComponentRoot, onError, onMount, onUnmount } from "defuss"
import { Async, type AsyncState } from "defuss-ui"

// When using TypeScript, interfaces come in handy
// They help with good error messages!
export interface CounterProps extends Props {

  // what the button displays
  label: string;
}

// renders 1 sec after initial render
// and 500ms after the last <Async /> render (<Counter />)
export async function Later({ key }: Props) {

  await new Promise((resolve) => setTimeout(resolve, 500))

  const btnRef = createRef()

  onError((err) => {
    console.log("[Later] !!!Error boundary caught an error", err)
    dequery(btnRef).jsx(<strong>Sorry, an error happened! Later</strong>);
  }, key)


  const didClick = () => {
    console.log("later click")
    throw new Error("Later click error")
  }

  return (
    <button type="button" onUnmount={() => {
      console.log("[Later] in onUnmount Later", key)
    }} ref={btnRef} onClick={didClick}>Very much later</button>
  )
}

// all Component functions are called once! 
// No reactivity means *zero* complexity!
export async function Counter({ label, key }: CounterProps) {

  // delays rendering by 500ms as the Promise resolves after the timeout
  await new Promise((resolve) => setTimeout(resolve, 500))

  // References the DOM element once it becomes visible.
  // They are also used to carry state. This way, a parent component can sync its state with a child component.
  const countButtonRef = createRef<number>();
  const containerRef = createRef()  

  console.log("[Counter] calling onError", key)

  onError((err) => {
    console.log("[Counter] Error boundary caught an error", err)
    dequery(countButtonRef).jsx(<strong>Sorry, an error happened!</strong>);
  }, key)

  onUnmount(() => {
    // TODO: missing a call! re-implement unmount using checking $$vdom on replace/remove?
    console.log("[Counter] in onUnmount Counter", key)
  }, key)

  onMount((el) => {
    if (isComponentRoot(el)) {
      console.log("[Counter] in onMount Counter", key, el)
    }
  }, key)

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
    dequery(countButtonRef).text(`Count is: ${clickCounter}`)

    console.log("updateLabel: Button text updated", clickCounter)
    //asyncRef.update("loaded")

    // sync to external state
    countButtonRef.update(clickCounter)

    // re-render the <Later /> component
    dequery(containerRef).jsx(
      <Async ref={containerRef} fallback={<div>Loading later...</div>}>
        <div>Async content</div>
        <Later key={`laterBtn-${key}`} />
      </Async>
    )

    if (clickCounter === 3) {
      console.error("I am an error!")
      throw new Error("I am an error")
    }
  }

  // Already when your code builds, this JSX is turned into a virtual DOM.
  // At runtime, the virtual DOM is rendered and displayed in the browser.
  // It usually is pre-rendered (SSR) on server-side and hydrated in the browser.
  return (
    <div class="counter-root">
      <button type="button" ref={countButtonRef} onClick={updateLabel}>
        {/* This label is rendered *once*. It will never change reactively! */}
        {/* Only with *explicit* code, will the content of this <button> change. */}
        {label}
      </button>
      <div ref={containerRef}>
        <Async fallback={<div>Loading later...</div>}>
          <div>Async content</div>
          <Later key={`laterBtn-${key}`} />
        </Async>
      </div>
    </div>
  )
}