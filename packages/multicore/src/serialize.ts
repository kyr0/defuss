/**
 * Serializes a pure function into a self-contained worker script string.
 * The generated script installs an `onmessage` handler that:
 * 1. Receives `{ type: "execute", id, args }` messages
 * 2. Calls the deserialized function with the args
 * 3. Posts back `{ type: "result", id, value }` (with Transferable for typed arrays)
 * 4. On error, posts back `{ type: "error", id, error, stack }`
 * 5. On `{ type: "abort" }`, does nothing (caller terminates the worker)
 */

/** Best-effort closure detection: look for free variables not declared in function body */
export const warnIfClosure = (fn: Function): void => {
  const src = fn.toString();

  // Arrow functions and regular functions both captured
  // Look for variable references that suggest closure capture.
  // This is heuristic — not guaranteed to catch everything.
  const bodyMatch = src.match(/\{([\s\S]*)\}$/);
  if (!bodyMatch) return; // single-expression arrow, likely safe

  const body = bodyMatch[1];

  // Common signs of closure: referencing `this` (in arrow fn context),
  // or top-level variables that aren't params/locals
  if (/\bthis\b/.test(body) && src.startsWith("(")) {
    console.warn(
      "[defuss-multicore] Warning: function references `this` which will be undefined in a worker context.",
    );
  }
};

/**
 * Generates a worker script string from a function.
 * The script is fully self-contained and can be executed in a
 * Web Worker (via Blob URL) or worker_threads (via eval).
 */
export const serializeFunction = (fn: Function): string => {
  warnIfClosure(fn);

  const fnString = fn.toString();

  // The worker script:
  //  - Defines the function
  //  - Listens for messages
  //  - Calls the function and posts results back
  //  - Detects typed arrays in results for Transferable
  return `
'use strict';

const __fn = ${fnString};

const __isTypedArray = (v) =>
  ArrayBuffer.isView(v) && !(v instanceof DataView);

const __getTransferables = (value) => {
  if (__isTypedArray(value)) return [value.buffer];
  if (value instanceof ArrayBuffer) return [value];
  if (Array.isArray(value)) {
    const transfers = [];
    for (let i = 0; i < value.length; i++) {
      if (__isTypedArray(value[i])) transfers.push(value[i].buffer);
      else if (value[i] instanceof ArrayBuffer) transfers.push(value[i]);
    }
    return transfers;
  }
  return [];
};

const __handleMessage = (data) => {
  if (data.type === 'execute') {
    try {
      const result = __fn(...data.args);
      const transfer = __getTransferables(result);
      const msg = { type: 'result', id: data.id, value: result };
      if (typeof postMessage === 'function') {
        postMessage(msg, transfer);
      } else {
        const { parentPort } = require('node:worker_threads');
        parentPort.postMessage(msg, transfer);
      }
    } catch (err) {
      const msg = {
        type: 'error',
        id: data.id,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      };
      if (typeof postMessage === 'function') {
        postMessage(msg);
      } else {
        const { parentPort } = require('node:worker_threads');
        parentPort.postMessage(msg);
      }
    }
  }
  // 'abort' type is a no-op; the caller terminates the worker externally
};

// Browser Web Worker
if (typeof self !== 'undefined' && typeof self.onmessage !== 'undefined') {
  self.onmessage = (e) => __handleMessage(e.data);
}

// Node.js worker_threads
if (typeof require !== 'undefined') {
  try {
    const { parentPort } = require('node:worker_threads');
    if (parentPort) {
      parentPort.on('message', __handleMessage);
    }
  } catch (_) {
    // Not in worker_threads context — ignore
  }
}
`.trim();
};
