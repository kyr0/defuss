import "server-only";

const RPC_WHITELIST = new Set<string>(["/api/auth/login", "/api/auth/logout"]);

export function requireAuth(request: Request) {
  const { pathname } = new URL(request.url);
  if (RPC_WHITELIST.has(pathname)) return null;

  const token = request.headers.get("authorization");
  if (!token || !token.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
