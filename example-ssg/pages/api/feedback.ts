import type { APIRoute } from "defuss-ssg";

export const POST = (async ({ request }) => {
  const body = await request.json().catch(() => null);
  return new Response(
    JSON.stringify({
      message: "Sent an email out!",
      received: body,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}) satisfies APIRoute;
