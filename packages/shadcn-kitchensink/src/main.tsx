import "./css/index.css";

import { render } from "defuss/client";
import { type FC, Route, RouterSlot } from "defuss";
import { MainLayout } from "./layouts/MainLayout.js";

import { Home } from "./screens/Home.js";
import { Introduction } from "./screens/Introduction.js";
import { Installation } from "./screens/Installation.js";
import { KitchenSink } from "./screens/KitchenSink.js";
import { ComponentDemo } from "./screens/ComponentDemo.js";

export function RouterOutlet() {
    return (
        <>
            <Route path="/">
                <Home />
            </Route>

            <Route path="/introduction">
                <Introduction />
            </Route>

            <Route path="/installation">
                <Installation />
            </Route>

            <Route path="/kitchen-sink">
                <KitchenSink />
            </Route>

            {/* Dynamic async since ComponentDemo awaits Router.ready() */}
            <Route path="/components/:name">
                <ComponentDemo />
            </Route>
        </>
    );
}

const App: FC = () => {
    return (
        <MainLayout>
            <RouterSlot tag="div" RouterOutlet={RouterOutlet} />
        </MainLayout>
    );
}

render(<App />, document.getElementById("app")!);