import type { IncomingMessage, ServerResponse } from "node:http";

export type NodeLikeRequest = IncomingMessage & {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  originalUrl?: string;
};

export type NodeLikeResponse = ServerResponse & {
  headersSent?: boolean;
  status?: (code: number) => NodeLikeResponse;
  send?: (body?: unknown) => void;
};

const canHaveRequestBody = (method: string): boolean =>
  method !== "GET" && method !== "HEAD";

export const readIncomingBody = async (
  req: NodeLikeRequest,
): Promise<Buffer | undefined> => {
  const method = String(req.method || "GET").toUpperCase();
  if (!canHaveRequestBody(method)) {
    return undefined;
  }

  return await new Promise<Buffer | undefined>((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
    });
    req.on("error", reject);
  });
};

export const parseJsonBody = <T>(body?: Uint8Array): T | undefined => {
  if (!body || body.byteLength === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.from(body).toString("utf8")) as T;
};

export const createWebRequest = (
  req: NodeLikeRequest,
  body?: Uint8Array,
): Request => {
  const method = String(req.method || "GET").toUpperCase();
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers || {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const host =
    headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost";
  const protocol = headers.get("x-forwarded-proto") ?? "http";
  const requestUrl = new URL(
    req.originalUrl ?? req.url ?? "/",
    `${protocol}://${host}`,
  );

  return new Request(requestUrl, {
    method,
    headers,
    body: canHaveRequestBody(method) ? body : undefined,
  });
};

export const sendWebResponse = async (
  res: NodeLikeResponse,
  response: Response,
  stripBody = false,
): Promise<void> => {
  res.statusCode = response.status;
  res.status?.(response.status);

  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  if (stripBody) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());

  if (typeof res.send === "function") {
    res.send(body);
    return;
  }

  res.end(body);
};