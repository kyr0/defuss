import { createRef, type Props } from 'defuss'
import typescriptLogo from '../img/typescript.svg'
import styles from './App.module.css'
import { Counter } from './Counter.tsx'
import { AstroLogo } from './icon/AstroLogo.tsx';

export interface AppProps extends Props {

  // current click counter
  clickCount?: number;
}

export function App({ clickCount = 0 }: AppProps) {

  // Ref's are powerful in defuss, they can carry state up to the parent component
  const counterRef = createRef<HTMLDivElement, number>()

  // subscribe to the counterRef's controlled state (can be arbitrary data)
  counterRef.subscribe((value: number) => {
    console.log(`[App] Counter value has updated: ${value}`)
  });

  return (
    // fragments work
    <>
      <a href="https://astro.build" target="_blank" rel="noreferrer" aria-label="Astro Logo">
        <AstroLogo class={[styles.Logo, styles.Vanilla]} />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
        <img src={typescriptLogo.src} class={[styles.Logo, styles.Vanilla]} alt="TypeScript logo" />
      </a>
      <a href="https://www.github.com/kyr0/defuss" target="_blank" rel="noreferrer">
        <img src="/defuss_mascott.png" class={[styles.Logo, styles.Vanilla]} alt="defuss logo" />
      </a>
      <h1>Astro + TypeScript + defuss</h1>
      {/* you can use React-like className if you prefer */}
      <div className={styles.Card}>
        <Counter ref={counterRef} label="Don’t. You. Dare. 👀" clickCount={clickCount} />
      </div>
      <p class={styles.ReadTheDocs}>
        Click on the Astro, TypeScript and defuss logos to learn more
      </p>
    </>
  )
}