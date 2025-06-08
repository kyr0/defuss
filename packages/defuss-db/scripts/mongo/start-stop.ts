import { execSync } from "node:child_process";
import { getEnv } from "../../src/env";

export const startMongo = async () => {
  const containerName = getEnv("MONGO_CONTAINER_NAME");

  try {
    // Check if container exists and get its status
    const containerInfo = execSync(
      `docker ps -a --filter name=^${containerName}$ --format "{{.Status}}"`,
      { encoding: "utf8", stdio: "pipe" },
    ).trim();

    if (containerInfo) {
      // Container exists, check if it's running
      if (containerInfo.startsWith("Up")) {
        console.log(`MongoDB container '${containerName}' is already running.`);
        return;
      } else {
        // Container exists but is stopped, start it
        console.log(
          `Starting existing MongoDB container '${containerName}'...`,
        );
        execSync(`docker start ${containerName}`, { stdio: "inherit" });
        console.log("MongoDB started.");
        return;
      }
    }
  } catch (error) {
    // Container doesn't exist or other error, proceed to create it
  }

  // Container doesn't exist, create and start it
  console.log(`Creating new MongoDB container '${containerName}'...`);
  execSync(
    `docker run -d --name ${containerName} -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=${getEnv("MONGO_INITDB_ROOT_USERNAME")} -e MONGO_INITDB_ROOT_PASSWORD=${getEnv("MONGO_INITDB_ROOT_PASSWORD")} mongo`,
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
