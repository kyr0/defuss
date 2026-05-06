import "./Counter.css";

// we need a few imports from the library (TypeScript-only)
import { type Props, createRef, $ } from "defuss";

// When using TypeScript, interfaces come in handy
// They help with good error messages!
export interface CounterProps extends Props {
	// what the button displays
	label: string;

	// current click counter
	clickCount: number;
}

const renderLabel = (clickCount: number, defaultLabel: string) => {
	return clickCount ? `Count is: ${clickCount}` : defaultLabel;
};

// Component functions are called once!
// No reactivity means *zero* complexity!
export function Counter({ label, forwardRef = createRef(), clickCount }: CounterProps) {
	// References the DOM element once it becomes visible.
	// When it's gone, the reference is gone. Easy? Yeah.
	const buttonRef = createRef<HTMLButtonElement>();

	// A native event handler. Called when the user clicks on the button.
	// Receives the native DOMs MouseEvent. No magic here either!
	const onUpdateLabel = async (_evt: MouseEvent) => {
		// just increment the counter variable on click. Easy? Yeah.
		clickCount++;
		forwardRef.updateState(clickCount); // update the parent component's state

		console.log(
			"[Counter] onUpdateLabel: Native mouse event",
			clickCount,
		);

		try {
			// Changes the innerText of the <button> element.
			// You could also do: buttonRef.current.innerText = `...`
			// but dequery works like jQuery and is much simpler!
			$(buttonRef).text(renderLabel(clickCount, label));
		} catch (err) {
			console.log("[Counter] Error in onUpdateLabel", err);
		}

		if (clickCount === 100) {
			$(buttonRef).debug((_el) => {
				$(buttonRef).update(<strong>Maximum count reached.</strong>);

				forwardRef.updateState(0); // update the parent component's state
				clickCount = 0; // reset the local state
			});
		}
	};

	const whenMouseDownCapture = (_evt: MouseEvent) => {
		console.log("[Counter] in whenMouseDownCapture: Mouse down capture");
	};

	// Already when your code builds, this JSX is turned into a virtual DOM.
	// At runtime, the virtual DOM is rendered and displayed in the browser.
	// It usually is pre-rendered (SSR) on server-side and hydrated in the browser.
	return (
		<button
			class="Counter"
			type="button"
			ref={buttonRef}
			onClick={onUpdateLabel}
			onMouseDownCapture={whenMouseDownCapture}
			onMount={(_el: Element) => console.log("[Counter] (Button) Mounted")}
			onUnmount={(_el: Element) => console.log("[Counter] (Button) Unmounted")}
		>
			{/* This label is rendered *once*. It will never change reactively! */}
			{/* Only with *explicit* code, will the content of this <button> change. */}
			{renderLabel(clickCount, label)}
		</button>
	);
}
