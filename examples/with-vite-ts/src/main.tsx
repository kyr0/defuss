import './style.css'

import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { Counter } from './counter.js'
import { $ } from 'defuss' 
import { render } from 'defuss/client' 

function App() {
  return (
    // fragments work
    <>
      <a href="https://vite.dev" target="_blank" rel="noreferrer">
        {/* class works */}
        <img src={viteLogo} class="logo" alt="Vite logo" />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
        <img src={typescriptLogo} class="logo vanilla" alt="TypeScript logo" />
      </a>
      <a href="https://www.github.com/kyr0/defuss" target="_blank" rel="noreferrer">
      {/* className works too */}
        <img src="/defuss_mascott.png" className="logo defuss" alt="defuss logo" />
      </a>
      <h1>Vite + TypeScript + defuss</h1>
      <div class="card">
        <Counter label="Don’t. You. Dare. 👀" />
      </div>
      <p class="read-the-docs">
        Click on the Vite, TypeScript and defuss logos to learn more
      </p>
    </>
  )
}

// initial render
render(<App />, $('#app'))