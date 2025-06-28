import "./index.css";

import { WasmC } from "./ui/wasm_c";
import viteLogo from "/vite.svg";
import { $ } from "defuss";
import { render } from "defuss/client";
import { WasmRust } from "./ui/wasm_rust";
import { Js } from "./ui/js";
import { JsJit } from "./ui/js_jit";
import { SampleData } from "./ui/sample_data";

function App() {
  return (
    // fragments work
    <>
      <div class="pt-lg vbox justify-center">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          {/* class works */}
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a
          href="https://www.github.com/kyr0/defuss"
          target="_blank"
          rel="noreferrer"
        >
          {/* className works too */}
          <img
            src="/defuss_mascott.png"
            className="logo defuss"
            alt="defuss logo"
          />
        </a>
        <a
          href="https://www.typescriptlang.org/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={"/typescript.svg"}
            class="logo vanilla"
            alt="TypeScript logo"
          />
        </a>
      </div>

      <h1>WebAssembly Demo</h1>

      <div class="p-lg vbox justify-center">
        <SampleData />
      </div>

      <div class="p-lg vbox justify-center">
        <div class="hbox justify-center p-md">
          <h3>Pure JS</h3>
          <Js />
        </div>

        <div class="hbox justify-center p-md">
          <h3>C/emscripten</h3>
          <WasmC />
        </div>

        <div class="hbox justify-center p-md">
          <h3>JIT-optimized JS</h3>
          <JsJit />
        </div>

        <div class="hbox justify-center p-md">
          <h3>Rust</h3>
          <WasmRust />
        </div>
      </div>

      <p class="dim">
        Click on the Vite, TypeScript and defuss logos to learn more.
      </p>
    </>
  );
}
// initial render
render(<App />, $("#app"));
