import { getEnv } from "../src/env.js";
import { ping } from "../src/provider/mongodb.js";
import { startMongo } from "./mongo/start-stop.js";

console.log(
  "Starting MongoDB with container name:",
  getEnv("MONGO_CONTAINER_NAME"),
);

await startMongo();

console.log("Attempting to connect to MongoDB...");
await ping(getEnv("MONGO_CONNECTION_STRING") as string);
console.log("Successfully connected to MongoDB!");

process.exit(0);
