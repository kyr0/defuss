import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  try {
    console.log("GET /api/v1/health");

    return new Response(
      JSON.stringify({
        status: "OK",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in GET /api/v1/health:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
