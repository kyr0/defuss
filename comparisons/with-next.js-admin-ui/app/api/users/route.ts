import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const users = await mockStore.listUsers();
  return Response.json({ users });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const user = await mockStore.createUser(payload);
  return Response.json({ user }, { status: 201 });
}
