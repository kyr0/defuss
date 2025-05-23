import { _binaryToBase64 } from "./base64.js";
export const isGlobalValue = (value: any): boolean =>
  Object.getOwnPropertyNames(globalThis).some(
    (key) => (globalThis as any)[key] === value,
  );
/**
 * Asynchronously stringify any JavaScript value
 *
 * @param deserialized The value to stringify
 * @param replacer An optional replacer function or array
 * @param space Optional space for formatting
 * @param windowObj Optional Window object for DOM handling
 * @returns A promise that resolves to the stringified result
 */
export async function stringify(
  deserialized: any,
  replacer?:
    | ((this: any, key: string, value: any) => any)
    | (string | number)[]
    | null,
  space: string | number = 0,
  windowObj?: Window | null,
): Promise<string> {
  // Try to use provided window or fall back to global
  if (!windowObj && typeof globalThis !== "undefined") {
    windowObj = globalThis.window || null;
  }

  const refs = new Map<any, number>();
  let refCounter = 0;
  // Set of objects being currently processed to detect nested circular references
  const processing = new WeakSet();
  // Maximum recursion depth to prevent stack overflow
  const MAX_DEPTH = 100;

  // Helper to handle circular references
  const checkForCircularRef = (value: any): [null, "ref", number] | null => {
    if (refs.has(value)) {
      return [null, "ref", refs.get(value)!];
    }
    return null;
  };

  // Helper to register object with refs
  const registerRef = (value: any): number => {
    const id = refCounter++;
    refs.set(value, id);
    return id;
  };

  async function dsonReplacer(value: any, depth = 0): Promise<any> {
    // Skip any native runtime value reference
    if (isGlobalValue(value)) {
      return [null, "Skip", null];
    }

    // Add depth check to prevent excessive recursion
    if (depth > MAX_DEPTH) {
      console.warn("Maximum recursion depth reached, truncating serialization");
      return null;
    }

    if (
      value === null ||
      (typeof value !== "object" && typeof value !== "function")
    ) {
      if (typeof value === "bigint") {
        return [null, "BigInt", value.toString()];
      }

      if (typeof value === "symbol") {
        return [null, "Symbol", value.description || ""];
      }
      return value;
    }

    // Detect objects currently being processed (nested circular refs)
    if (processing.has(value)) {
      // If we're already processing this object, return a reference if available
      // or return null to break the cycle
      return refs.has(value) ? [null, "ref", refs.get(value)!] : null;
    }

    // Check for circular references
    const circularRef = checkForCircularRef(value);
    if (circularRef) return circularRef;

    // For complex objects, mark as being processed to detect nested circulars
    if (typeof value === "object" && value !== null) {
      processing.add(value);
    }

    try {
      // Assign a reference ID (to identify circular references)
      const id = registerRef(value);

      const constructorName = value.constructor?.name;

      // Handle collection types first
      // Arrays should be checked before anything else to ensure proper handling
      if (Array.isArray(value)) {
        const items = await Promise.all(
          value.map((item) => dsonReplacer(item, depth + 1)),
        );
        return [id, "Array", items];
      }

      // Map should be checked before custom class checks
      if (value instanceof Map) {
        const entries = await Promise.all(
          Array.from(value.entries()).map(async ([k, v]) => [
            await dsonReplacer(k, depth + 1),
            await dsonReplacer(v, depth + 1),
          ]),
        );
        return [id, "Map", entries];
      }

      // Set should be checked before custom class checks
      if (value instanceof Set) {
        const items = await Promise.all(
          Array.from(value).map((item) => dsonReplacer(item, depth + 1)),
        );
        return [id, "Set", items];
      }

      // Add explicit RegExp handling
      if (value instanceof RegExp) {
        return [id, "RegExp", { source: value.source, flags: value.flags }];
      }

      if (value instanceof URL) {
        return [id, "URL", value.href];
      }

      if (value instanceof URLSearchParams) {
        return [id, "URLSearchParams", value.toString()];
      }

      if (value instanceof WeakMap) {
        return [id, "WeakMap", null];
      }

      if (value instanceof WeakSet) {
        return [id, "WeakSet", null];
      }

      if (typeof value === "function") {
        return [id, "Function", value.toString()];
      }

      if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        const typedArrayType = value.constructor.name;
        const bytes = new Uint8Array(
          value.buffer,
          value.byteOffset,
          value.byteLength,
        );
        const base64 = _binaryToBase64(bytes.buffer);

        return [
          id,
          typedArrayType,
          {
            buffer: base64,
            byteOffset: value.byteOffset,
            byteLength: value.byteLength,
            length: (value as unknown as { length: number }).length,
          },
        ];
      }

      if (value instanceof Error) {
        return [
          id,
          "Error",
          {
            name: value.name,
            message: value.message,
            stack: value.stack,
          },
        ];
      }

      // File object (must check before Blob since File inherits from Blob)
      if (typeof File !== "undefined" && value instanceof File) {
        try {
          // Actually read the file content
          const arrayBuffer = await value.arrayBuffer();
          const base64 = _binaryToBase64(arrayBuffer);

          return [
            id,
            "File",
            {
              name: value.name,
              type: value.type,
              size: value.size,
              lastModified: value.lastModified,
              data: base64, // Store the actual file content
            },
          ];
        } catch (e) {
          console.warn("Could not read File content:", e);
          // Fallback to metadata only
          return [
            id,
            "File",
            {
              name: value.name,
              type: value.type,
              size: value.size,
              lastModified: value.lastModified,
              data: null,
            },
          ];
        }
      }

      // FileList support (collection of files)
      if (typeof FileList !== "undefined" && value instanceof FileList) {
        // Process each file asynchronously
        const filePromises = Array.from(value).map(async (file) => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = _binaryToBase64(arrayBuffer);
            const fileId = registerRef(file);
            return {
              id: fileId,
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              data: base64,
            };
          } catch (e) {
            console.warn(`Could not read content for file ${file.name}:`, e);
            const fileId = registerRef(file);
            return {
              id: fileId,
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              data: null,
            };
          }
        });

        const files = await Promise.all(filePromises);
        return [id, "FileList", files];
      }

      // FormData support
      if (typeof FormData !== "undefined" && value instanceof FormData) {
        const entries: Record<string, any> = {};
        const entryPromises: Promise<void>[] = [];

        value.forEach((val, key) => {
          // For File objects, process asynchronously
          if (typeof File !== "undefined" && val instanceof File) {
            if (refs.has(val)) {
              // Reference already processed file
              entries[key] = {
                _type: "FileRef",
                _id: refs.get(val),
              };
            } else {
              // Process file asynchronously
              const processPromise = (async () => {
                try {
                  const arrayBuffer = await val.arrayBuffer();
                  const base64 = _binaryToBase64(arrayBuffer);
                  entries[key] = {
                    _type: "File",
                    name: val.name,
                    type: val.type,
                    size: val.size,
                    lastModified: val.lastModified,
                    data: base64,
                  };
                } catch (e) {
                  console.warn(`Could not read FormData file ${val.name}:`, e);
                  entries[key] = {
                    _type: "File",
                    name: val.name,
                    type: val.type,
                    size: val.size,
                    lastModified: val.lastModified,
                    data: null,
                  };
                }
              })();
              entryPromises.push(processPromise);
            }
          } else if (
            typeof FileList !== "undefined" &&
            val instanceof FileList
          ) {
            // FileList references
            if (refs.has(val)) {
              entries[key] = {
                _type: "FileListRef",
                _id: refs.get(val),
              };
            } else {
              // Process FileList asynchronously
              const processPromise = (async () => {
                const fileList = await dsonReplacer(val, depth + 1);
                entries[key] = fileList;
              })();
              entryPromises.push(processPromise);
            }
          } else {
            // Handle non-File entries by pushing a promise that processes them
            const processPromise = (async () => {
              entries[key] = await dsonReplacer(val, depth + 1);
            })();
            entryPromises.push(processPromise);
          }
        });

        // Wait for all entries to be processed
        await Promise.all(entryPromises);
        return [id, "FormData", entries];
      }

      // NodeList support (collection of DOM nodes)
      if (typeof NodeList !== "undefined" && value instanceof NodeList) {
        // Process each node asynchronously
        const nodePromises = Array.from(value).map(async (node) => {
          const nodeId = registerRef(node);
          if (node.nodeType === 1) {
            // Element node
            const element = node as Element;
            return {
              id: nodeId,
              type: "Element",
              tagName: element.tagName,
              innerHTML: element.innerHTML,
              attributes: Array.from(element.attributes).reduce(
                (acc, attr) => {
                  acc[attr.name] = attr.value;
                  return acc;
                },
                {} as Record<string, string>,
              ),
            };
          } else if (node.nodeType === 3) {
            // Text node
            return {
              id: nodeId,
              type: "Text",
              data: node.textContent,
            };
          } else if (node.nodeType === 8) {
            // Comment node
            return {
              id: nodeId,
              type: "Comment",
              data: node.textContent,
            };
          } else {
            return {
              id: nodeId,
              type: "Other",
              nodeType: node.nodeType,
              data: node.textContent,
            };
          }
        });

        const nodes = await Promise.all(nodePromises);
        return [id, "NodeList", nodes];
      }

      // Before the custom class checks, add specific handlers for DOM nodes
      // Check for Element nodes
      if (typeof Element !== "undefined" && value instanceof Element) {
        return [
          id,
          "Element",
          {
            tagName: value.tagName,
            innerHTML: value.innerHTML,
            attributes: Array.from(value.attributes).reduce(
              (acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              },
              {} as Record<string, string>,
            ),
          },
        ];
      }

      // Check for Text nodes
      if (typeof Text !== "undefined" && value instanceof Text) {
        return [id, "Text", value.textContent];
      }

      // Check for Comment nodes
      if (typeof Comment !== "undefined" && value instanceof Comment) {
        return [id, "Comment", value.textContent];
      }

      // Handle custom classes - need to check earlier before regular object
      if (
        constructorName &&
        constructorName !== "Object" &&
        typeof value === "object"
      ) {
        const properties: any = {};
        const propertyPromises = [];

        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            const propValue = value[key];

            propertyPromises.push(
              (async () => {
                try {
                  // Pass the incremented depth to track recursion
                  properties[key] = await dsonReplacer(propValue, depth + 1);
                } catch (e) {
                  console.warn(`Error serializing property ${key}:`, e);
                  properties[key] = null;
                }
              })(),
            );
          }
        }

        await Promise.all(propertyPromises);

        return [
          id,
          "Class",
          {
            className: constructorName,
            properties,
          },
        ];
      }

      // Regular objects - default case
      const result: any = {};

      // Process regular object properties asynchronously
      const propertyPromises = [];

      // Handle regular enumerable properties
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const processPromise = (async () => {
            try {
              // Increment depth for recursion tracking
              result[key] = await dsonReplacer(value[key], depth + 1);
            } catch (e) {
              console.warn(`Error serializing property ${key}:`, e);
              result[key] = null;
            }
          })();
          propertyPromises.push(processPromise);
        }
      }

      // Handle Symbol keys (not captured by for...in)
      const symbolKeys = Object.getOwnPropertySymbols(value);
      if (symbolKeys.length > 0) {
        result.__symbols__ = {};

        for (const symKey of symbolKeys) {
          const keyDesc = symKey.description || "unnamed_symbol";
          const processPromise = (async () => {
            result.__symbols__[keyDesc] = await dsonReplacer(
              value[symKey],
              depth + 1,
            );
          })();
          propertyPromises.push(processPromise);
        }
      }

      // Wait for all property processing to complete
      await Promise.all(propertyPromises);
      return [id, "Object", result];
    } finally {
      // Clean up processing marker when done with this object
      if (typeof value === "object" && value !== null) {
        processing.delete(value);
      }
    }
  }

  const processed = await dsonReplacer(deserialized);
  return JSON.stringify(processed, replacer as any, space);
}
