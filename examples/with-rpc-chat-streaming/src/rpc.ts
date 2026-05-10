import { addHook } from "defuss-rpc/server.js";
import { AuthApi } from "./rpc/auth.js";
import { ChatApi } from "./rpc/chat-api.js";

export const RpcApi = {
	AuthApi,
	ChatApi,
};

interface WhitelistRpcCall {
	className: string;
	methodName: string;
}

const rpcCallWhitelist: WhitelistRpcCall[] = [
	{ className: "AuthApi", methodName: "login" },
	{ className: "AuthApi", methodName: "logout" },
];

addHook({
	phase: "guard",
	fn: (
		className: string,
		methodName: string,
		args: unknown[],
		request: Request,
	) => {
		const token = request.headers.get("Authorization");

		console.log("RPC Call:", { className, methodName, args: args.length > 0 ? `[${args.length} args]` : "[]" });

		const isWhitelisted = rpcCallWhitelist.some(
			(rpcCall) =>
				rpcCall.className === className && rpcCall.methodName === methodName,
		);

		if (isWhitelisted) {
			return true;
		}

		if (!token || !token.startsWith("Bearer ")) {
			console.log("Blocking RPC Call (no auth):", { className, methodName });
			return false;
		}

		return true;
	},
});

export default RpcApi;

export type RpcApi = typeof RpcApi;
