Vite plugin with one single GET endpoint, auto-routing to class/method calls configured by an RPC mapping the types; client based on Proxy() and async/await, server based on auto-mapping with
interfaces that can be shared between client and server.

Uses `defuss-dson` for serialization/deserialization of data structures.

// server:
```ts
// rpc/interface.ts (might be shared between client and server)

export interface Notebook {
  id: string;
  title: string;
  content: string;
}

export interface NotebookServiceApi {
  getNotebook(id: string): Promise<Notebook>;
  createNotebook(notebook: Notebook): Promise<Notebook>;
} 

export interface RpcApi {
  NotebookServiceApi: NotebookServiceApi;
}

// rpc/notebook.ts
import type { NotebookServiceApi } from './interface.js';

export class NotebookService implements NotebookServiceApi {

  async get(id: string): Promise<Notebook> {
    return await this.getNotebookById(id);
  }

  async create(notebook: Notebook): Promise<Notebook> {
    return await this.createNotebook(notebook);
  }
}

// rpc/middleware.ts

import type { MiddlewareFn } from 'defuss-rpc/server';

export const guard: MiddlewareFn = async (req: Request, res: Response) => {
  console.log('Guard executed');

  // if it returns a Response, it's the final response, else the router continues
};

export const logRequest: MiddlewareFn = async (req: Request, res: Response) => {
  console.log('Logger executed');

  // if it returns a Response, it's the final response, else the router continues
};

// pages/rpc.ts -> GET /rpc
// pages/rpc.ts -> GET /rpc?spec -> retruns the JSON spec

import { rpc } from 'defuss-rpc/server';
import { guardm, logRequest } from '../rpc/middleware.js';
import { Notebook } from '../rpc/notebook.js';

export const GET = async(request: Request, response: Response) =>
  rpc({
    request, 
    response, 
    pre: [guard],
    services: [Notebook], 
    post: [logRequest],
  });
```

// client:

```ts
import { rpc } from 'defuss-rpc/client';
import type { RpcApi } from './rpc/interface.js';

export const RPC: RpcApi = await rpc(/** optional '/rpc' */);

const someUser = await RPC.NotebookService.getNotebook('123');
console.log('someUser', someUser);
```
