#!/usr/bin/env node

import { performSparseCheckout } from "./git.js";

export * from "./git.js";

// define an asynchronous main function to handle the CLI logic
const main = async () => {
  // retrieve command-line arguments, excluding the first two (node and script path)
  const args = process.argv.slice(2);

  // check if the number of arguments is valid (either 1 or 2)
  if (args.length < 1 || args.length > 2) {
    // if not, print usage instructions and exit with an error code
    console.error(
      "Usage: create-defuss <repo-url> [destination-folder]\n" +
        "Example: create-defuss https://github.com/kyr0/defuss/tree/main/examples/with-astro-ts ./my-new-project"
    );
    process.exit(1);
  }

  // assign the first argument to repoUrl and the second to destFolder, defaulting to "." (current directory) if not provided
  const repoUrl = args[0];
  const destFolder = args[1];

  // call the performSparseCheckout function with the provided arguments
  performSparseCheckout(repoUrl, destFolder);
};

// execute the main function and handle any unexpected errors
main().catch((err) => {
  // log the error and exit with an error code
  console.error("Unexpected error:", err);
  process.exit(1);
});