import { genEd25519Pair } from "./crypto.js";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function encode(o: unknown) {
  return Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
}

async function main() {
  const cmd = process.argv[2];

  if (cmd === "gen-keys") {
    const envFile = ".env.defuss_auth_keys";
    const envPath = join(process.cwd(), envFile);

    if (existsSync(envPath)) {
      console.error(
        `Error: ${envFile} already exists. Cannot override existing keys for security reasons.`,
      );
      process.exit(1);
    }

    const { publicJwk, privateJwk, kid } = await genEd25519Pair();

    const envContent = `# Generated Ed25519 key pair - KEEP THE PRIVATE KEY SECRET!
DEFUSS_AUTH_PRIVATE_JWK=${encode(privateJwk)}
DEFUSS_AUTH_PUBLIC_JWK=${encode(publicJwk)}
DEFUSS_AUTH_KID=${kid}
`;

    writeFileSync(envPath, envContent, "utf8");
    console.log(`Generated new Ed25519 key pair in: ${envFile}`);
    console.log("!! THE PRIVATE KEY MUST BE KEPT SECRET !!");

    return;
  }

  console.error(`Usage:
  npx defuss-auth gen-keys
`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
