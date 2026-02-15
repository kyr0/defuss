import type { APIRoute } from "defuss-ssg";

// this takes the response from the GET endpoint and writes it to the 
// endpoints path on disk as a file!
export const prerender = true;

export const GET = (({ params, request }) => {
  return new Response(
    JSON.stringify({
      name: "defuss",
      url: "https://defuss.dev/",
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}) satisfies APIRoute;
