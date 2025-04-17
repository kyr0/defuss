import { $, createRef, type Props } from 'defuss'
import typescriptLogo from '../img/typescript.svg'
import { Counter } from './Counter.tsx'
import { AstroLogo } from './icon/AstroLogo.tsx';

// using defuss on-the-fly image optimization (WebAssembly/Rust based)
import { Img } from 'defuss-astro/client.js';

import './App.css'

export interface AppProps extends Props {

  // current click counter, passed down by SSR
  clickCount?: number;
}

export function App({ clickCount = 0 }: AppProps) {

  // Ref's are powerful in defuss. They are defined in parent components to reference and communicate with child components.
  const counterRef = createRef<number>()

  // subscribe to the counterRef's controlled state (can be arbitrary data)
  const unsubscribe = counterRef.subscribe((value: number) => {
    console.log(`[App] Counter value has updated: ${value}`)

    if (value === 100) {
      // remove the counter component when the counter reaches 100
      unsubscribe();
    }
  });

  return (
    <>
      <div class="pt-lg vbox justify-center">
        <a href="https://astro.build" target="_blank" rel="noreferrer" aria-label="Astro.build Website">
          <AstroLogo class="logo" />
        </a>
        <a href="https://www.github.com/kyr0/defuss" target="_blank" rel="noreferrer" aria-label="defuss Website">
          {/** using <Img /> automatically transforms the image to WEBP */}
          <Img src="/defuss_logo.png" class="logo" alt="defuss logo" />
        </a>
        <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer" aria-label="TypeScript Language Website">
          <img src={typescriptLogo.src} class="logo" alt="TypeScript logo" />
        </a>
      </div>
      <h1>Astro + defuss + TypeScript</h1>
      {/* you can use React-like className if you prefer */}
      <div className="p-lg vbox justify-center">
        <div class="hbox gap-md">
          Maximum count logic applies when the counter reaches 100. <br />
          <i>(Refresh to get a new SSR / hydrated initial state)</i>
          <Counter ref={counterRef} label="Don’t. You. Dare. 1 👀" clickCount={clickCount} key="counter-1" />
          <Counter ref={counterRef} label="Don’t. You. Dare. 2 👀" clickCount={clickCount} key="counter-2" />
        </div>
      </div>
      <p class={["dim"]}>
        Click on the Astro, TypeScript and defuss logos to learn more.
      </p>
    </>
  );
}