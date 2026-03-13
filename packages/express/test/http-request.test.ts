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

  it("returns protocol unknown for empty buffer", () => {
    const req = parseRequestHead(Buffer.alloc(0));
    expect(req.protocol).toBe("unknown");
    // Empty buffer splits into [""], so method/path are empty strings
    expect(req.method).toBe("");
    expect(req.path).toBeUndefined();
  });

  it("returns protocol unknown when header block is incomplete", () => {
    const buffer = Buffer.from("GET / HTTP/1.1\r\nHost: example.com");
    const req = parseRequestHead(buffer);
    // Still parses what it can, but rawHead won't have the double CRLF
    expect(req.method).toBe("GET");
    expect(req.protocol).toBe("http1");
    expect(req.headers.host).toBe("example.com");
  });

  it("parses POST with Content-Length", () => {
    const buffer = Buffer.from(
      "POST /api/data HTTP/1.1\r\nHost: localhost\r\nContent-Length: 13\r\nContent-Type: application/json\r\n\r\n",
    );
    const req = parseRequestHead(buffer);
    expect(req.method).toBe("POST");
    expect(req.path).toBe("/api/data");
    expect(req.headers["content-length"]).toBe("13");
    expect(req.headers["content-type"]).toBe("application/json");
    expect(req.protocol).toBe("http1");
  });

  it("skips malformed header lines without a colon", () => {
    const buffer = Buffer.from(
      "GET / HTTP/1.1\r\nHost: ok.com\r\nBadHeaderNoCOLON\r\nAccept: */*\r\n\r\n",
    );
    const req = parseRequestHead(buffer);
    expect(req.headers.host).toBe("ok.com");
    expect(req.headers.accept).toBe("*/*");
    // The malformed line should not appear
    expect(Object.keys(req.headers)).not.toContain("badheadernocolon");
  });

  it("last value wins for duplicate headers", () => {
    const buffer = Buffer.from(
      "GET / HTTP/1.1\r\nX-Custom: first\r\nX-Custom: second\r\n\r\n",
    );
    const req = parseRequestHead(buffer);
    expect(req.headers["x-custom"]).toBe("second");
  });

  it("handles HTTP/1.0 version", () => {
    const buffer = Buffer.from("GET / HTTP/1.0\r\nHost: legacy\r\n\r\n");
    const req = parseRequestHead(buffer);
    expect(req.httpVersion).toBe("1.0");
    expect(req.protocol).toBe("http1");
  });

  it("trims whitespace from header values", () => {
    const buffer = Buffer.from(
      "GET / HTTP/1.1\r\nHost:   spaced.com   \r\n\r\n",
    );
    const req = parseRequestHead(buffer);
    expect(req.headers.host).toBe("spaced.com");
  });

  it("lowercases header names", () => {
    const buffer = Buffer.from(
      "GET / HTTP/1.1\r\nX-MY-HEADER: value\r\nContent-Type: text/plain\r\n\r\n",
    );
    const req = parseRequestHead(buffer);
    expect(req.headers["x-my-header"]).toBe("value");
    expect(req.headers["content-type"]).toBe("text/plain");
  });

  it("passes through remoteAddress and remotePort as undefined when not given", () => {
    const buffer = Buffer.from("GET / HTTP/1.1\r\n\r\n");
    const req = parseRequestHead(buffer);
    expect(req.remoteAddress).toBeUndefined();
    expect(req.remotePort).toBeUndefined();
  });

  it("handles binary-safe latin1 header values", () => {
    // Latin1 allows bytes 0x80-0xFF per RFC 7230 §3.2.4
    const raw = "GET / HTTP/1.1\r\nX-Bin: caf\xE9\r\n\r\n";
    const buffer = Buffer.from(raw, "latin1");
    const req = parseRequestHead(buffer);
    expect(req.headers["x-bin"]).toBe("caf\xE9");
  });
});
