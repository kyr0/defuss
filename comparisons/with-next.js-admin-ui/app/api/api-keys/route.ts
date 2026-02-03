import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const apiKeys = await mockStore.listApiKeys();
  return Response.json({ apiKeys });
}
