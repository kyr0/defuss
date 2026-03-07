import "./css/index.css";
// @ts-ignore - virtual module: imports the project's CSS files
import "virtual:storybook/project-css";
import { render } from "defuss";
import { App } from "./App.js";

render(<App />, document.getElementById("app")!);
