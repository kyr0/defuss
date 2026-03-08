export async function runCommand(name: string, args: Array<any>) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "run-command",
        text: JSON.stringify({ name, args }),
      },
      (response) => {
        if (response.success) {
          resolve(response.result);
          console.log("Command executed successfully", name, args);
        } else {
          reject(`Command failed to execute: ${name}`);
        }
      },
    );
  });
}
