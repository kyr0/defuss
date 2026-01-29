import { execSync } from "node:child_process";
import { getEnv } from "../../src/env";

export const startMongo = async () => {
  const containerName = getEnv("MONGO_CONTAINER_NAME");

  if (!containerName) {
    throw new Error("MONGO_CONTAINER_NAME is not set in env.");
  }

  console.log(`Checking MongoDB container '${containerName}'...`);

  try {
    // Check if container exists by trying to inspect it
    const containerInfo = execSync(
      `docker inspect ${containerName} --format "{{.State.Status}}"`,
      { encoding: "utf8", stdio: "pipe" },
    ).trim();

    if (containerInfo === "running") {
      console.log(`MongoDB container '${containerName}' is already running.`);
      return;
    } else if (containerInfo === "exited") {
      // Container exists but is stopped, start it
      console.log(`Starting existing MongoDB container '${containerName}'...`);
      execSync(`docker start ${containerName}`, { stdio: "inherit" });
      console.log("MongoDB started.");
      return;
    }
  } catch (error) {
    // Container doesn't exist, proceed to create it
  }

  // Container doesn't exist, create and start it
  console.log(`Creating new MongoDB container '${containerName}'...`);
  execSync(
    `docker run -d --name ${containerName} -p 27018:27017 -e MONGO_INITDB_ROOT_USERNAME=${getEnv("MONGO_INITDB_ROOT_USERNAME")} -e MONGO_INITDB_ROOT_PASSWORD=${getEnv("MONGO_INITDB_ROOT_PASSWORD")} mongo`,
    { stdio: "inherit" },
  );
  console.log("MongoDB started.");
};

export const stopMongo = async () => {
  try {
    execSync(`docker stop ${getEnv("MONGO_CONTAINER_NAME")}`, {
      stdio: "inherit",
    });
  } catch (error) {
    // Container might not be running, continue with removal
  }

  try {
    execSync(`docker rm ${getEnv("MONGO_CONTAINER_NAME")}`, {
      stdio: "inherit",
    });
  } catch (error) {
    // Container might not exist, ignore error
  }

  console.log("MongoDB stopped.");
};
