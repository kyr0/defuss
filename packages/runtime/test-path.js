import { getAllKeysFromPath, getByPath } from "./src/datatype/string/path.js";

console.log("Testing getAllKeysFromPath:");
console.log("a[0]b:", getAllKeysFromPath("a[0]b"));
console.log("test[999]:", getAllKeysFromPath("test[999]"));

console.log("\nTesting getByPath with empty string:");
const testObj = { value: "test" };
console.log('getByPath(obj, ""):', getByPath(testObj, ""));
