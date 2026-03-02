// example-ssg/rpc.ts
//
// RPC API for the example SSG project.
// Automatically discovered and served by defuss-ssg at /rpc.
//
// Usage on the client:
//
//   import { getRpcClient } from "defuss-rpc/client.js";
//   import type rpcExports from "../rpc";
//   const rpc = await getRpcClient<typeof rpcExports>();
//   const sum = await rpc.mathApi.add(1, 2); // fully typed!

export interface MathApi {
  add(a: number, b: number): Promise<number>;
  multiply(a: number, b: number): Promise<number>;
}

const mathApi: MathApi = {
  add: async (a, b) => a + b,
  multiply: async (a, b) => a * b,
};

export interface GreetApi {
  hello(name: string): Promise<string>;
}

const greetApi: GreetApi = {
  hello: async (name) => `Hello, ${name}!`,
};

export default { mathApi, greetApi };
