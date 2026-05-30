/**
 * Network interception helpers for content scripts (ISOLATED world).
 *
 * Works by sending a postMessage to the MAIN-world preload script
 * which patches window.fetch and forwards matching responses back
 * via postMessage.
 */

export interface InterceptedResponse {
  url: string;
  status: number;
  body: string;
}

/**
 * Register a one-shot fetch interceptor for requests whose URL contains
 * `urlPattern`. Returns a promise that resolves with the first matching
 * response body (as raw text). Times out after `timeoutMs`.
 *
 * Must be called *before* the request is triggered (e.g. before clicking
 * a search button).
 */
export function interceptFetch(
  urlPattern: string,
  timeoutMs = 30_000,
): Promise<InterceptedResponse> {
  const requestId = `fetch_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return new Promise<InterceptedResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(
        new Error(
          `Fetch intercept timeout: no request matched "${urlPattern}" within ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (typeof data !== "object" || data === null) return;
      if (data.__defuss !== true) return;
      if (data.action !== "fetch_intercepted") return;
      if (data.requestId !== requestId) return;

      clearTimeout(timeout);
      window.removeEventListener("message", handler);
      resolve({
        url: data.url,
        status: data.status,
        body: data.body,
      });
    };

    window.addEventListener("message", handler);

    // Tell MAIN world to start intercepting
    window.postMessage(
      {
        __defuss: true,
        action: "intercept_fetch",
        requestId,
        urlPattern,
      },
      "*",
    );
  });
}
