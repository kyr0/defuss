import { execSync } from "node:child_process";
import { getEnv } from "../../src/env";

export const startMongo = async () => {
  execSync(
    `docker run -d --name ${getEnv("MONGO_CONTAINER_NAME")} -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=${getEnv("MONGO_INITDB_ROOT_USERNAME")} -e MONGO_INITDB_ROOT_PASSWORD=${getEnv("MONGO_INITDB_ROOT_PASSWORD")} mongo`,
    { stdio: "inherit" },
  );
  console.log("MongoDB started.");
};

export const stopMongo = async () => {
  execSync(`docker stop ${getEnv("MONGO_CONTAINER_NAME")}`, {
    stdio: "inherit",
  });
  execSync(`docker rm ${getEnv("MONGO_CONTAINER_NAME")}`, {
    stdio: "inherit",
  });
  console.log("MongoDB stopped.");
};
