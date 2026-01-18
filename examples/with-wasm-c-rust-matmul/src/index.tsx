import "./styles/index.css";
import "./styles/reset.css";
import "./styles/palette.css";
import "./styles/squeezy.css";

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

      <h1>defuss C/Rust integration using WebAssembly</h1>
      <p>This demo runs many matmul ops in parallel using different runtimes</p>

      <div class="p-lg vbox justify-center align-center">
        <div style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}>Ops #:</div>
        <SampleData />
      </div>

      <h5>IMPORTANT:<br />Output is printed to the console. <br /> Please open the developer tools!</h5>

      <div class="vbox justify-center">
        <div class="hbox justify-center p-md">
          <h3>Plain JS - naive</h3>
          <Js />
        </div>

        <div class="hbox justify-center p-md">
          <h3>C/Emscripten - WASM</h3>
          <WasmC />
        </div>

        <div class="hbox justify-center p-md">
          <h3>JIT-optimized JS</h3>
          <JsJit />
        </div>

        <div class="hbox justify-center p-md">
          <h3>Rust - WASM</h3>
          <WasmRust />
        </div>
      </div>
    </>
  );
}
// initial render
render(<App />, $("#app"));
