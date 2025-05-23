import indexeddb from "fake-indexeddb";
import * as HappyDom from "happy-dom";

export const setup = async () => {
  console.log("Setting up Happy DOM and IndexedDB Shim...");

  (globalThis as any).window = new HappyDom.Window({
    url: "http://localhost/",
  });

  window.indexedDB = indexeddb;
  globalThis.indexedDB = indexeddb;

  console.log("Happy DOM and IndexedDB Shim setup complete!");
};
