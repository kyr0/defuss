import { rpcRoute } from "../../lib/rpc-server.js";
import "../../rpc.js";

// export * from "defuss-rpc/api" which does this
export const prerender = false;
export const POST = rpcRoute;
