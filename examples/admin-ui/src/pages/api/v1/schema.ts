import type { APIRoute } from 'astro';
import { getEnv } from 'astro/env/runtime';

// returns the OpenAPI Swagger schema, dynamically processed
export const GET: APIRoute = async ({ request }) => {
  try {
    console.log('GET /v1/schema');
    const schemaResponse = await fetch(`${getEnv('SELF_URL')}/openapi.json`);
    const schemaJson = await schemaResponse.json();

    return new Response(JSON.stringify(schemaJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /v1/ping:', error);
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};