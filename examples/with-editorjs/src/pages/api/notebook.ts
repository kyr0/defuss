import { readFileSync } from "node:fs";
import type { APIRoute } from "astro";
import type { NotebookFileEntry } from "../../models/Notebook";

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  try {
    const notebooks = Object.keys(
      import.meta.glob("../../../data/notebooks/*.json", { eager: true }),
    ).map((relativePath) => {
      const absolutePath = new URL(relativePath, import.meta.url).pathname;
      return {
        path: relativePath,
        notebook: JSON.parse(readFileSync(absolutePath, "utf-8")),
      } as NotebookFileEntry;
    });

    return new Response(JSON.stringify({ success: true, data: notebooks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/notebook:', error);
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const PATCH: APIRoute = async ({ request }) => {
  try {

    // constains the full update 
    const notebookFileEntry: NotebookFileEntry = await request.json();

    return new Response(JSON.stringify({ success: true, data: notebookFileEntry }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in PATCH /api/notebook:', error);
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
