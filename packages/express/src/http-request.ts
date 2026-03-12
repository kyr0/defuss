import type { ParsedRequest } from "./types.js";

const HEADER_END = Buffer.from("\r\n\r\n");

/**
 * Return `true` when `buffer` contains a complete HTTP/1.x header
 * block (terminated by `\r\n\r\n`).
 *
 * Used by the primary-process load balancer to decide whether enough
 * data has arrived for request-aware routing.
 */
export const hasCompleteHttpHeaders = (buffer: Buffer): boolean =>
  buffer.includes(HEADER_END);

/**
 * Parse the HTTP/1.x request-line and headers from a raw TCP buffer.
 *
 * This function runs on the **hot path** of every inbound connection
 * to the load balancer so that pluggable {@link LoadBalancerFunction}
 * implementations can make routing decisions based on method, path,
 * host, or arbitrary headers.  Parsing is intentionally simple
 * (single `split` + `reduce`) and bounded by the configurable
 * `maxHeaderBytes` / `requestInspectionTimeoutMs` limits.
 *
 * Headers are decoded as `latin1` per RFC 7230 §3.2.4.
 *
 * @param buffer         - Raw bytes buffered from the client socket.
 * @param remoteAddress  - Client IP (from `socket.remoteAddress`).
 * @param remotePort     - Client port (from `socket.remotePort`).
 * @returns A {@link ParsedRequest} with protocol `"http1"` on success
 *          or `"unknown"` when the request-line could not be parsed.
 */
export const parseRequestHead = (
  buffer: Buffer,
  remoteAddress?: string,
  remotePort?: number,
): ParsedRequest => {
  const rawHead = buffer.toString("latin1");
  const lines: string[] = rawHead.split("\r\n");
  const requestLine = lines[0] ?? "";
  const [method, path, httpVersionToken] = requestLine.split(" ");
  const httpVersion = httpVersionToken?.startsWith("HTTP/")
    ? httpVersionToken.slice("HTTP/".length)
    : undefined;

  const headers = lines.slice(1).reduce((acc: Record<string, string>, line: string) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      return acc;
    }

    const name = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (name.length > 0) {
      acc[name] = value;
    }
    return acc;
  }, {});

  return {
    method,
    path,
    httpVersion,
    host: headers.host,
    headers,
    remoteAddress,
    remotePort,
    protocol: method && path ? "http1" : "unknown",
    rawHead,
  };
};
