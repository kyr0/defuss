import { requireAuth } from "@/lib/auth";
import { mockStore } from "@/lib/mock-store";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const users = await mockStore.listUsers();
  return Response.json({ users });
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const payload = await request.json();
  const user = await mockStore.createUser(payload);
  return Response.json({ user }, { status: 201 });
}
