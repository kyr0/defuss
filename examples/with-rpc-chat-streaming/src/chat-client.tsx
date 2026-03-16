import { createRef, render } from "defuss";
import { getRpcClient, clearSchemaCache } from "defuss-rpc/client.js";
import { rpcBaseUrl } from "virtual:defuss-rpc";
import type RpcApi from "./rpc.js";

const outputRef = createRef<HTMLDivElement>();
const btnRef = createRef<HTMLButtonElement>();

async function startStream() {
  const btn = btnRef.current!;
  const output = outputRef.current!;
  btn.disabled = true;
  output.textContent = "";

  try {
    clearSchemaCache();
    const rpc = await getRpcClient<typeof RpcApi>({ baseUrl: rpcBaseUrl });
    const stream = rpc.ChatApi.streamMessage("Hello, AI!");

    for await (const chunk of stream) {
      output.textContent += (output.textContent ? " " : "") + chunk;
    }
  } catch (err: any) {
    output.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

const App = () => (
  <div style="max-width:600px;margin:2rem auto;font-family:system-ui">
    <h1>defuss-rpc Chat Streaming</h1>
    <p>Click the button to stream a simulated AI response word-by-word via RPC generators.</p>
    <button ref={btnRef} onClick={startStream} id="stream-btn">
      Stream Message
    </button>
    <div
      ref={outputRef}
      id="output"
      style="margin-top:1rem;padding:1rem;border:1px solid #ccc;min-height:80px;border-radius:4px;white-space:pre-wrap"
    />
  </div>
);

render(<App />, document.getElementById("app")!);
