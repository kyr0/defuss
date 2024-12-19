import { $, createRef, onError, onUnmount, type Props } from 'defuss'
import typescriptLogo from '../img/typescript.svg'
import { Counter } from './Counter.tsx'
import { AstroLogo } from './icon/AstroLogo.tsx';

import'./App.css'
import { Img } from 'defuss-ui';

export interface AppProps extends Props {

  // current click counter
  clickCount?: number;
}

export function App({ clickCount = 0 }: AppProps) {

  onError((err: unknown) => {
    console.error('[App] Error boundary caught an error', err)
  }, App)

  const resizeHandler = () => {
    console.log('[App] window resized')
  }

  onUnmount(() => {
    console.log('[App found out!] Counter unmounted')
  }, Counter)

  window.addEventListener('resize', resizeHandler);

  //document.body.style.backgroundColor = '#cc0000'

  // Ref's are powerful in defuss, they can communicate state up to the parent component
  const counterRef = createRef<HTMLDivElement, number>()

  // subscribe to the counterRef's controlled state (can be arbitrary data)
  const unsubscribe = counterRef.subscribe((value: number) => {
    console.log(`[App] Counter value has updated: ${value}`)

    if (value === 100) {
      // remove the counter component when the counter reaches 100
      $(counterRef).remove()
      unsubscribe();
    }
  });

  return (
    // fragments work
    <>
      <a href="https://astro.build" target="_blank" rel="noreferrer" aria-label="Astro.build Website">
        <AstroLogo class="Logo" />
      </a>
      <a href="https://www.github.com/kyr0/defuss" target="_blank" rel="noreferrer" aria-label="defuss Website">
        <Img src="/defuss_logo.webp" class="Logo" alt="defuss logo" />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer" aria-label="TypeScript Language Website">
        <img src={typescriptLogo.src} class="Logo" alt="TypeScript logo" />
      </a>
      <h1>Astro + defuss + TypeScript</h1>
      {/* you can use React-like className if you prefer */}
      <div className="Card">
        <Counter ref={counterRef} label="Don’t. You. Dare. 👀" clickCount={clickCount} />
      </div>
      <p>
        Click on the Astro, TypeScript and defuss logos to learn more.
      </p>
    </>
  );
}