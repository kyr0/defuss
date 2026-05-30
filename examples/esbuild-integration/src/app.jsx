import { $, render } from "defuss";

export const App = () => {
  const handleClick = () => {
    alert("Hello from esbuild!");
  };

  return (
    <div class="app-container">
      <h1>esbuild App</h1>
      <p>Welcome to the defuss esbuild example!</p>
      <button type="button" onClick={handleClick}>
        Click me
      </button>
    </div>
  );
};

// Only mount if running in browser with #app element
if (typeof document !== "undefined") {
  render(<App />, document.getElementById("app"));
}
