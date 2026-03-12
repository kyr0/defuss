import { describe, expect, it } from "vitest";

import { hasCompleteHttpHeaders, parseRequestHead } from "../src/http-request.js";

describe("parseRequestHead", () => {
  it("parses a regular GET request", () => {
    const buffer = Buffer.from(
      "GET /hello?x=1 HTTP/1.1\r\nHost: example.com\r\nUser-Agent: vitest\r\n\r\n",
    );

    const request = parseRequestHead(buffer, "127.0.0.1", 1234);

    expect(request.method).toBe("GET");
    expect(request.path).toBe("/hello?x=1");
    expect(request.httpVersion).toBe("1.1");
    expect(request.headers.host).toBe("example.com");
    expect(request.remoteAddress).toBe("127.0.0.1");
    expect(request.remotePort).toBe(1234);
    expect(request.protocol).toBe("http1");
  });

  it("detects completed headers", () => {
    expect(hasCompleteHttpHeaders(Buffer.from("GET / HTTP/1.1\r\n\r\n"))).toBe(true);
    expect(hasCompleteHttpHeaders(Buffer.from("GET / HTTP/1.1\r\nHost: x"))).toBe(false);
  });
});
