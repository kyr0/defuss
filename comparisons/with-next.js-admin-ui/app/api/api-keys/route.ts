import { requireAuth } from "@/lib/auth";
import { mockStore } from "@/lib/mock-store";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const apiKeys = await mockStore.listApiKeys();
  return Response.json({ apiKeys });
}
