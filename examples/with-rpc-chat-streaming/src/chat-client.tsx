// Legacy entry - the app is now rendered via Astro CSR (see src/csr/app.tsx).
// This file is kept for the standalone index.html fallback.
import { render } from "defuss";
import { App } from "./csr/app";

render(<App />, document.getElementById("app")!);
