/** Supported function names that can be called in the active tab's content script */
export type ContentScriptFnName = "showAlert";

export async function runCommand(name: string, args: Array<any>) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "run-command",
        text: JSON.stringify({ name, args }),
      },
      (response) => {
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(`Command failed to execute: ${name}`);
        }
      },
    );
  });
}

/** Call a typed function in the active tab's content script via the worker */
export async function runFnInActiveTab(fnName: ContentScriptFnName, ...args: any[]) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "run-fn-in-tab",
        text: JSON.stringify({ fnName, args }),
      },
      (response) => {
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(response?.error || `run-fn-in-tab failed: ${fnName}`);
        }
      },
    );
  });
}
