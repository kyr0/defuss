import { getAuthHeader } from "@core/auth/server/authentication";
import { getApiKeyFromSearchParams } from "@core/auth/server/authentication";
import { isApiKeyAuthenticated } from "@core/auth/server/authentication";
import { isUserAuthenticated } from "@core/auth/server/authentication";
import { isCronServiceAuthenticated } from "@core/auth/server/authentication";
import type { MiddlewareHandler } from "astro";

const withHeaders = (request: Request, response: Response): Response => {
  withCachePolicy(response);
  withCorsHeaders(request, response);
  return response;
};

const withCachePolicy = (response: Response): Response => {
  response.headers.set("Cache-Control", "no-store");
  return response;
};

const withCorsHeaders = (request: Request, response: Response): Response => {
  response.headers.set("Access-Control-Allow-Origin", "*"); //new URL(request.url).origin);
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("Access-Control-Request-Headers"),
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "900"); // 15 minutes
  response.headers.set("Vary", "*"); // implies that the response is uncacheable.
  return response;
};

export const UnauthenticatedRoutes = [
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/health",
  "/api/v1/ping",
  "/api/v1/schema",
  "/rpc",
  "/",
];

const isAnonymous = (request: Request, locals: App.Locals): boolean => {
  const url = new URL(request.url);
  const isAnonymousRoute = UnauthenticatedRoutes.includes(url.pathname);

  if (isAnonymousRoute) {
    locals.userType = "anonymous";
    return true;
  }
  return false;
};

async function handleOptions(request: Request): Promise<Response> {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS preflight requests
    return withHeaders(request, new Response(null));
  } else {
    // Handle standard OPTIONS request
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH",
      },
    });
  }
}

/** this function is called _before_ each API/Cron handler call */
/** validation of header "Authorization: ApiKey $apiKey" or URL search param ?apiKey=$apiKey */
/** Vercel calls with "Authorization: Bearer $cronSecret" */
export const onRequest: MiddlewareHandler = async (
  { request, locals },
  next,
): Promise<Response> => {
  // pre-flight request
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  try {
    const _isAnonymous = isAnonymous(request, locals);
    const _isApiKeyAuthenticated = await isApiKeyAuthenticated(request, locals);
    const _isCronServiceAuthenticated = isCronServiceAuthenticated(
      request,
      locals,
    );
    const _isUserAuthenticated = await isUserAuthenticated(request, locals);

    if (
      // if the request is for an unauthenticated route, we allow it
      _isAnonymous ||
      // if the request is authenticated, we allow it
      _isApiKeyAuthenticated ||
      _isCronServiceAuthenticated ||
      _isUserAuthenticated
    ) {
      const response = await next();
      return withHeaders(request, response);
    }

    // if an apiKey or Authorization header was provided, but it wasn't valid
    // we return a 401, Unauthorized
    if (getApiKeyFromSearchParams(request) || getAuthHeader(request)) {
      console.log("Middleware blocked request: No valid auth");
      return withHeaders(
        request,
        new Response("Unauthorized", { status: 401 }),
      );
    }

    // if no apiKey or Authorization header was provided, we return a 403
    console.log("Middleware blocked request with no valid auth");
    return withHeaders(request, new Response("Not Found", { status: 403 }));
  } catch (error) {
    console.error("Middleware error", error.message, error.stack);
    return withHeaders(
      request,
      new Response("Internal Server Error", { status: 500 }),
    );
  }
};
