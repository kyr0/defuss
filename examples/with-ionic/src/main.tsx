import "./styles.js"
import { $, Route, Redirect, RouterSlot } from 'defuss' 
import { render } from 'defuss/client'
import { Page } from './pages/Page.js'
import { Menu } from './components/Menu.js'

function RouterOutlet() {
  return <>
    <Redirect path="/" exact={true} to="/home" />
        
    <Route path="/home">
      <Page name="Home" />
    </Route>

    <Route path="/list">
      <Page name="List" />
    </Route>
  </>
}

function App() {
  return (
    <ion-app>
      <ion-split-pane contentId="main">

        {/* the menu renders the menu entries for some or all <Route />'s */} 
        <Menu />

        {/* client-side routing (pages) are rendered here - the RouterOutlet is passed by reference, because it runs delayed later */} 
        <RouterSlot tag="ion-content" RouterOutlet={RouterOutlet} />

      </ion-split-pane>

    </ion-app>
  )
}
// initial render
render(<App />, $('body'))