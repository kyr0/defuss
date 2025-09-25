import UIkit from "uikit";
import { createRef, $ } from "defuss";
import {
  rule,
  transval,
  Rules,
  access,
  type FieldValidationMessage,
} from "defuss-transval";
import type { RpcApi } from "../../rpc.js";
import { getRpcClient, setHeaders, addHook } from "defuss-rpc/client.js";

setHeaders({
  Authorization: "Bearer FOOBARTOKEN",
});

export const testRpc = async () => {
  const rpc = await getRpcClient<RpcApi>();

  addHook({
    fn: (
      className: string,
      methodName: string,
      args: any[],
      request?: RequestInit,
      response?: Response,
      data?: unknown,
    ) => {
      console.log("Request:", { className, methodName, args });
      console.log("Request Init:", request);
      console.log("Response:", response);
      console.log("Data:", data);
    },
    phase: "result",
  });

  const fooApi = new rpc.FooApi();
  const authApi = new rpc.AuthApi();

  console.log("goil", await fooApi.helloWorld(42));
  console.log("works", await authApi.login("user@example.com", "password"));
};

export function DashboardScreen() {
  $(() => {
    testRpc();
  });

  return <div class="w-full max-w-sm">TODO</div>;
}
