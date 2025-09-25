import { getEnv } from "defuss-env";
import { ping } from "defuss-db/server.js";
import { startMongo } from "./mongo/start-stop.js";

console.log(
  "Starting MongoDB with container name:",
  getEnv("MONGO_CONTAINER_NAME"),
);

await startMongo();

console.log("Waiting for MongoDB to be ready...");
// Give MongoDB a moment to fully start up
await new Promise((resolve) => setTimeout(resolve, 3000));

console.log("Attempting to connect to MongoDB...");
try {
  await ping(getEnv("MONGO_CONNECTION_STRING") as string);
  console.log("Successfully connected to MongoDB!");
} catch (error) {
  console.error("Failed to connect to MongoDB. It may still be starting up.");
  console.error("Connection string:", getEnv("MONGO_CONNECTION_STRING"));
  console.error("Error:", error.message);
  process.exit(1);
}

process.exit(0);
