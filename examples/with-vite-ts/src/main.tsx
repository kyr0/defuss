import './style.css'

import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { Counter } from './counter.js'
import { $, onError, onMount } from 'defuss' 
import { render } from 'defuss/client' 
import { Async } from 'defuss-ui'

function App() {

  onError((err) => {
    // TODO: missing call!
    console.log("[App] Error boundary caught an error", err)
  
  }, App);


  onMount((el) => {
    console.log("[App] in onMount App", el)
  }, App)

  const onLinkClick = (e: MouseEvent) => {
    e.preventDefault()
    alert('You clicked a link!')
    throw new Error('I am an error!')
  }

  return (
    // fragments work
    <>
      <a href="https://vite.dev" target="_blank" rel="noreferrer" onClick={onLinkClick}>
        {/* class works */}
        <img src={viteLogo} class="logo" alt="Vite logo" />
      </a>  
      <a href="https://www.github.com/kyr0/defuss" target="_blank" rel="noreferrer">
      {/* className works too */}
        <img src="/defuss_mascott.png" className="logo defuss" alt="defuss logo" />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
        <img src={typescriptLogo} class="logo vanilla" alt="TypeScript logo" />
      </a>
    
      <h1>Vite + defuss + TypeScript</h1>
      <div class="card">
        <Async fallback={<div>Loading...</div>}>
          <Counter label="Don’t. You. Dare. 👀" key="1" />
          <div>Noch irgendwas synchrones dazwischen</div>
          <Counter label="2x Don’t. You. Dare. 👀" key="2" />
        </Async>
      </div>
      <p class="read-the-docs">
        Click on the Vite, TypeScript and defuss logos to learn more
      </p>
    </>
  )
}
// initial render
render(<App />, $('#app'))