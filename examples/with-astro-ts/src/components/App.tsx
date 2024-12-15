import { createRef, type Props } from 'defuss'
import typescriptLogo from '../img/typescript.svg'
import { Counter } from './Counter.tsx'
import { AstroLogo } from './icon/AstroLogo.tsx';
import'./App.css'

export interface AppProps extends Props {

  // current click counter
  clickCount?: number;
}

export function App({ clickCount = 0 }: AppProps) {

  // Ref's are powerful in defuss, they can communicate state up to the parent component
  const counterRef = createRef<HTMLDivElement, number>()

  // subscribe to the counterRef's controlled state (can be arbitrary data)
  counterRef.subscribe((value: number) => {
    console.log(`[App] Counter value has updated: ${value}`)
  });

  return (
    // fragments work
    <>
      <a href="https://astro.build" target="_blank" rel="noreferrer" aria-label="Astro.build Website">
        <AstroLogo class="Logo" />
      </a>
      <a href="https://www.github.com/kyr0/defuss" target="_blank" rel="noreferrer" aria-label="defuss Website">
        <img src="/defuss_logo.webp" class="Logo" alt="defuss logo" />
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
  )
}