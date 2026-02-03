import { requireAuth } from "@/lib/auth";
import { mockStore } from "@/lib/mock-store";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const tenants = await mockStore.listTenants();
  return Response.json({ tenants });
}
