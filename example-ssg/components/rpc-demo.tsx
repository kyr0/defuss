import type { Props, FC } from "defuss";
import { $, createRef } from "defuss";
import type rpcExports from "../rpc.js";

export interface RpcDemoProps extends Props {}

const RpcDemo: FC<RpcDemoProps> = () => {
  const resultRef = createRef<HTMLQuoteElement>();
  const inputARef = createRef<HTMLInputElement>();
  const inputBRef = createRef<HTMLInputElement>();
  const inputNameRef = createRef<HTMLInputElement>();
  const formRef = createRef<HTMLFormElement>();

  type RpcApi = typeof rpcExports;
  let rpcClient: RpcApi = null;

  const makeRpcClient = async () => {
    if (rpcClient) return rpcClient; // simple memoization to avoid multiple clients
    const { getRpcClient } = await import("defuss-rpc/client.js");
    rpcClient = await getRpcClient<RpcApi>();
    return rpcClient;
  };

  const getInputs = () => {
    const a = Number($(inputARef).val()) || 0;
    const b = Number($(inputBRef).val()) || 0;
    const formData = $(formRef).form();

    console.log("Form data:", formData); // Debug: log the entire form data

    const name = String($(inputNameRef).val() || "World");
    return { a, b, name };
  };

  const callAdd = async () => {
    console.log("Calling mathApi.add with inputs:", getInputs()); // Debug: log inputs before RPC call
    const rpc = await makeRpcClient();
    const { a, b } = getInputs();
    const sum = await rpc.mathApi.add(a, b);
    $(resultRef).text(`${a} + ${b} = ${sum}`);
  };

  const callMultiply = async () => {
    const rpc = await makeRpcClient();
    const { a, b } = getInputs();
    const product = await rpc.mathApi.multiply(a, b);
    $(resultRef).text(`${a} × ${b} = ${product}`);
  };

  const callGreet = async () => {
    const rpc = await makeRpcClient();
    const { name } = getInputs();
    const greeting = await rpc.greetApi.hello(name);
    $(resultRef).text(greeting);
  };

  return (
    <article id="rpc-demo">
      <header>
        <strong>🚀 Live RPC Demo</strong> - call server functions from the
        browser
      </header>
      <form class="grid" ref={formRef}>
        <label>
          A
          <input ref={inputARef} type="number" value="3" placeholder="a" />
        </label>
        <label>
          B
          <input ref={inputBRef} type="number" value="7" placeholder="b" />
        </label>
        <label>
          Name
          <input
            ref={inputNameRef}
            type="text"
            value="defuss"
            placeholder="name"
          />
        </label>
      </form>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;">
        <button type="button" onClick={callAdd}>
          mathApi.add(a, b)
        </button>
        <button type="button" className="secondary" onClick={callMultiply}>
          mathApi.multiply(a, b)
        </button>
        <button type="button" className="contrast" onClick={callGreet}>
          greetApi.hello(name)
        </button>
      </div>
      <blockquote ref={resultRef}>
        Click a button to call the server ↑
      </blockquote>
    </article>
  );
};

export default RpcDemo;
