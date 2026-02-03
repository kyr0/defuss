import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const tenants = await mockStore.listTenants();
  return Response.json({ tenants });
}
