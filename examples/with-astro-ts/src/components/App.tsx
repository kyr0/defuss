import { createRef, type Props, $ } from 'defuss'
import typescriptLogo from '../img/typescript.svg'
import { Counter } from './Counter.tsx'
import { AstroLogo } from './icon/AstroLogo.tsx';

import './App.css'

export interface AppProps extends Props {

	// current click counter, passed down by SSR
	clickCount?: number;
}


export function App({ clickCount = 0 }: AppProps) {

	const appRef = createRef<HTMLDivElement>();

	// Ref's are powerful in defuss. They are defined in parent components to reference and communicate with child components.
	const counterRef = createRef<HTMLButtonElement, number>();
	counterRef.updateState(clickCount); // initialize the counterRef's controlled state with the SSR value

	// subscribe to the counterRef's controlled state (can be arbitrary data)
	const unsubscribe = counterRef.subscribe((value: number) => {
		console.log(`[App] Counter value has updated: ${value}`)

		// update state if child-components state change (upward state sync)
		counterRef.updateState(value);

		// re-render the App when the counter value changes
		$(appRef).update(renderApp());

		// dynamic behavior change from when the counter reaches 100
		if (value === 100) {
			alert("Counter reached 100! We detach forwardRef update now!");
			// stop syncing state -> no more updates; all component state stays local now
			unsubscribe();
		}
	});

	const renderApp = () => (
		<div class="app-container" ref={appRef}>
			<div class="pt-lg vbox justify-center">
				<a href="https://astro.build" target="_blank" rel="noreferrer" aria-label="Astro.build Website">
					<AstroLogo class="logo" />
				</a>
				<a href="https://www.github.com/kyr0/defuss" target="_blank" rel="noreferrer" aria-label="defuss Website">
					<img src="/defuss_logo.png" class="logo" alt="defuss logo" />
				</a>
				<a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer" aria-label="TypeScript Language Website">
					<img src={typescriptLogo.src} class="logo" alt="TypeScript logo" />
				</a>
			</div>
			<h1>Astro + defuss + TypeScript</h1>
			{/* you can use React-like className if you prefer */}
			<div className="p-lg vbox justify-center">
				<div class="hbox gap-md">
					The state is multi-component synced until the counter reaches 100. <br />

					<i>(Refresh to get a new SSR / hydrated initial state)</i>

					<Counter forwardRef={counterRef} label="Don’t. You. Dare. 1 👀" clickCount={counterRef.state!} key="counter-1" />
					<Counter forwardRef={counterRef} label="Don’t. You. Dare. 2 👀" clickCount={counterRef.state!} key="counter-2" />

					<p>
						Counter state is: {counterRef.state!} <i>(passed up using forwardRef)</i>
					</p>
				</div>
			</div>
			<p class={["dim"]}>
				Click on the Astro, TypeScript and defuss logos to learn more.
			</p>
		</div>
	);

	return renderApp();
}
