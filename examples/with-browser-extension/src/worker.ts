declare const self: ServiceWorkerGlobalScope;

import { dbGetValue, dbSetValue } from "./lib/worker/db";
import { getValue, setValue } from "./lib/worker/prefs";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log("Received message:", request);

  (async () => {
    // Process the message
    if (request.action && request.text) {
      const data = JSON.parse(request.text);

      // Example processing: log action and text
      console.log("Action:", request.action);
      console.log("Data:", JSON.stringify(data));
      console.log("Data (parsed):", data);

      switch (request.action) {
        case "db-get": {
          console.log("DB GET", data.key);
          const result = await dbGetValue(data.key);
          sendResponse({ success: true, value: JSON.stringify(result) });
          break;
        }

        case "db-set": {
          console.log("DB SET", data.key, data.value);
          const pk = await dbSetValue(data.key, data.value);
          sendResponse({ success: true, value: JSON.stringify({ pk }) });
          break;
        }

        // persistent value storage: get
        case "get":
          try {
            const value = await getValue(
              data.key,
              undefined,
              data.local !== false,
            );

            console.log("GET", data.key, value);
            sendResponse({ success: true, value: JSON.stringify(value) });
          } catch (_error) {
            sendResponse({ success: false, value: undefined });
          }
          break;

        // persistent value storage: set
        case "set":
          console.log("SET", data.key, data.value);
          await setValue(data.key, data.value, data.local !== false);
          sendResponse({ success: true });
          break;

        case "run-command": {
          console.log("RUN COMMAND", data.name, data.args);
          try {
            const result = await chrome.runtime.sendMessage({
              action: "run-command",
              text: JSON.stringify({ name: data.name, args: data.args }),
            });
            sendResponse({ success: true, result });
          } catch (error: any) {
            console.error("Command execution failed:", error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        }
      }
    }
  })();
  return true; // allow async response
});
