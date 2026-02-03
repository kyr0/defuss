import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const [stats, activity] = await Promise.all([
    mockStore.getStats(),
    mockStore.getRecentActivity(),
  ]);

  return Response.json({ stats, activity });
}
