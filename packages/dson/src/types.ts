// Built-in JavaScript types that should not be treated as custom classes
export const builtInTypes = [
  // JavaScript core objects
  "Object",
  "Array",
  "Function",
  "Boolean",
  "Number",
  "String",
  "Symbol",
  "BigInt",
  "Date",
  "RegExp",
  "Error",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",

  // ArrayBuffer and typed arrays
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",

  // DOM-related
  "File",
  "Blob",
  "FileList",
  "NodeList",
  "URL",
  "URLSearchParams",

  // Web APIs
  "Headers",
  "FormData",
  "ImageData",

  // Node.js specific
  "Buffer",
];
