import { $, render } from "defuss";

export const App = () => {
    return (
        <div class="app-container">
            <h1>esbuild App</h1>
            <p>Welcome to the defuss esbuild example!</p>
        </div>
    );
};

// Only mount if running in browser with #app element
if (typeof document !== 'undefined') {
    render(<App />, document.getElementById("app"));
}