import { execSync } from "node:child_process";
import { getEnv } from "../src/env.js";

const containerName = getEnv("MONGO_CONTAINER_NAME");

function checkDocker() {
    try {
        execSync("docker info", { stdio: "ignore" });
    } catch (e) {
        console.error("\n\n---------------------------------------------------------");
        console.error("ERROR: Docker is not installed or the engine is not running!");
        console.error("Please: Install docker and start the engine!");
        console.error("---------------------------------------------------------\n\n");
        process.exit(1);
    }
}

async function main() {
    checkDocker();

    let isRunning = false;
    try {
        const output = execSync(
            `docker inspect -f '{{.State.Running}}' ${containerName}`,
            {
                stdio: "pipe",
                encoding: "utf-8",
            },
        ).trim();
        if (output === "true") {
            isRunning = true;
        }
    } catch (e) {
        // failed to inspect, probably doesn't exist
    }

    if (!isRunning) {
        console.log(
            `Container ${containerName} is not running. Starting via mongo-start script...`,
        );
        // Execute the start script by importing it
        await import("./mongo-start.ts");
        // mongo-start.ts puts the process to exit(0) automatically
    } else {
        console.log(`Container ${containerName} is running.`);
        process.exit(0);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
