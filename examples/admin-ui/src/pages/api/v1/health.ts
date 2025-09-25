import type { APIRoute } from "astro";
import { createBlockBlobSasUrl } from "@azure/blob";
import { verifyCrudOnRandomRecord } from "@model/test";
import { getEnv } from "@core/env";
import { DbName } from "@core/db";
import { newExpiryDate } from "@core/time";
import { getSelfUrl } from "src/lib";

const testEnvs = async () => {
  if (!getEnv(`MONGO_DB_URI_${DbName.BACKEND.toUpperCase()}`)) {
    throw new Error(`MONGO_DB_URI_${DbName.BACKEND.toUpperCase()} is not set`);
  }

  if (!getEnv(`MONGO_DB_NAME_${DbName.BACKEND.toUpperCase()}`)) {
    throw new Error(`MONGO_DB_NAME_${DbName.BACKEND.toUpperCase()} is not set`);
  }
};

const selfTest = async () => {
  await testEnvs();

  const selfUrl = getSelfUrl();

  console.log("Self URL:", selfUrl);
};

export const GET: APIRoute = async ({ request }) => {
  try {
    console.log("GET /v1/health");

    console.log("Running self test...");
    await selfTest();

    // 0. test database access
    console.log("Running db access test...");
    const x = await verifyCrudOnRandomRecord(`test-${Math.random()}`);
    console.log(`Upserted record with _id: ${x}`);

    // 1. test blob storage access
    console.log("Running blob storage access test...");
    const sasUrl = await createBlockBlobSasUrl(
      "text.txt",
      newExpiryDate(0, 0, 1, 0),
      "rcw",
    );

    if (!sasUrl) {
      throw new Error(`SAS URL is empty: ${sasUrl}`);
    }

    // 2. test firebase authentication access
    /*
    console.log('Running firebase API test...');
    const token = await loginAsTestUser();

    if (token?.token?.email !== getEnv('TEST_USER_EMAIL')) {
      throw new Error('Logged in user email does not match test user email');
    }
    */

    return new Response(
      JSON.stringify({
        status: "OK",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in GET /v1/health:", error);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
