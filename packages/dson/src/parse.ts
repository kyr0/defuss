import { _base64ToBinary } from "./base64.js";
import { _registerWithRefs } from "./refs.js";

/**
 * Asynchronously parse a DSON string
 *
 * @param serialized The DSON string to parse
 * @param classConstructors Optional map of class constructors
 * @param windowObj Optional Window object for DOM handling
 * @returns A promise that resolves to the parsed result
 */
export async function parse(
  serialized: string,
  classConstructors?: Record<string, new () => any>,
  windowObj?: Window | null,
): Promise<any> {
  if (!serialized) return null;
  const refs = new Map<number, any>();
  const pendingRefs = new Map<
    number,
    Array<{ obj: any; key: string | number | symbol }>
  >(); // Track pending references

  // Try to use provided window or fall back to global
  if (!windowObj && typeof globalThis !== "undefined") {
    windowObj = globalThis.window || null;
  }

  // Helper function to register and return objects
  const registerWithRefs = <T>(id: number | null, value: T): T => {
    const result = _registerWithRefs(refs, id, value);

    // Resolve any pending references to this object
    if (id !== null && pendingRefs.has(id)) {
      const pending = pendingRefs.get(id)!;
      for (const { obj, key } of pending) {
        obj[key] = result;
      }
      pendingRefs.delete(id);
    }

    return result;
  };

  // Create a type-check helper to reduce duplication
  const isGlobalType = (typeName: string): boolean => {
    return (
      typeof globalThis[typeName as keyof typeof globalThis] !== "undefined"
    );
  };

  // Pre-cache document for DOM operations
  const doc = windowObj?.document;

  // Helper for safe DOM element creation
  const safeCreateElement = (tagName: string): HTMLElement | null => {
    try {
      return doc?.createElement(tagName) || null;
    } catch (e) {
      console.warn(`Failed to create element ${tagName}:`, e);
      return null;
    }
  };

  // Helper for creating binary objects from base64
  const createBinaryFromBase64 = (
    id: number | null,
    data: string,
    ctor: new (length: number) => ArrayBufferLike,
  ): ArrayBufferLike => {
    const buffer = _base64ToBinary(data);
    if (!(buffer instanceof ctor)) {
      // Create the appropriate buffer type and copy data
      const bytes = new Uint8Array(buffer);
      const newBuffer = new ctor(bytes.length);
      new Uint8Array(newBuffer).set(bytes);
      return registerWithRefs(id, newBuffer);
    }
    return registerWithRefs(id, buffer);
  };

  async function reviver(value: any): Promise<any> {
    // Fast path for primitives
    if (value === null || typeof value !== "object") {
      return value;
    }

    // Fast path for arrays that aren't in DSON format
    if (
      Array.isArray(value) &&
      (value.length !== 3 || typeof value[1] !== "string")
    ) {
      return Promise.all(value.map((item) => reviver(item)));
    }

    // Handle DSON array format [id, type, data]
    if (Array.isArray(value) && value.length === 3) {
      const [id, type, data] = value;

      // Handle circular references
      if (type === "ref" && id === null) {
        if (refs.has(data)) {
          return refs.get(data);
        } else {
          // Create a placeholder for forward references
          const placeholder = { __pendingRef: data };
          return placeholder;
        }
      }

      // Process by type
      switch (type) {
        case "BigInt":
          return BigInt(data);
        case "Symbol":
          return data === "__undefined__" ? Symbol() : Symbol(data);
        case "undefined":
          return undefined;
        case "NaN":
          return Number.NaN;
        case "Infinity":
          return Number.POSITIVE_INFINITY;
        case "-Infinity":
          return Number.NEGATIVE_INFINITY;
        case "Error": {
          const error = new Error(data.message);
          error.name = data.name;
          error.stack = data.stack;
          return registerWithRefs(id, error);
        }
        case "URL":
          return registerWithRefs(id, new URL(data));
        case "URLSearchParams":
          return registerWithRefs(id, new URLSearchParams(data));
        case "WeakMap":
          return registerWithRefs(id, new WeakMap());
        case "WeakSet":
          return registerWithRefs(id, new WeakSet());
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array": {
          const buffer = _base64ToBinary(data.buffer);
          const TypedArrayConstructor = globalThis[
            type as keyof typeof globalThis
          ] as any;
          const result = new TypedArrayConstructor(
            buffer,
            data.byteOffset,
            data.length,
          );
          return registerWithRefs(id, result);
        }
        case "Map": {
          const result = new Map();
          registerWithRefs(id, result);
          const promises = data.map(async ([k, v]: [any, any]) => {
            // If the key is a Symbol descriptor in special format, recreate the Symbol
            if (k && Array.isArray(k) && k[1] === "Symbol") {
              const symKey = Symbol(k[2] || "");
              result.set(symKey, await reviver(v));
            } else {
              result.set(await reviver(k), await reviver(v));
            }
          });
          await Promise.all(promises);
          return result;
        }
        case "Set": {
          const result = new Set();
          registerWithRefs(id, result);
          const promises = data.map(async (item: any) => {
            result.add(await reviver(item));
          });
          await Promise.all(promises);
          return result;
        }
        case "RegExp":
          // Ensure RegExp is correctly revived by constructing it properly
          return registerWithRefs(id, new RegExp(data.source, data.flags));
        case "Date":
          return registerWithRefs(
            id,
            data === "Invalid Date" ? new Date("invalid") : new Date(data),
          );
        case "Array": {
          const processedData = await Promise.all(
            data.map(async (item: any, index: number) => {
              const value = await reviver(item);
              if (
                value &&
                typeof value === "object" &&
                value.__pendingRef !== undefined
              ) {
                // This is a forward reference, we'll handle it below
                return { __pendingRef: value.__pendingRef, __index: index };
              }
              return value;
            }),
          );

          const result = processedData.map((item) =>
            item && typeof item === "object" && item.__pendingRef !== undefined
              ? null
              : item,
          );

          registerWithRefs(id, result);

          // Handle pending references in the array
          for (const item of processedData) {
            if (
              item &&
              typeof item === "object" &&
              item.__pendingRef !== undefined
            ) {
              const refId = item.__pendingRef;
              const index = item.__index;
              if (!pendingRefs.has(refId)) {
                pendingRefs.set(refId, []);
              }
              pendingRefs.get(refId)!.push({ obj: result, key: index });
            }
          }

          return result;
        }
        case "Object": {
          const result = {};
          registerWithRefs(id, result);

          // Process properties asynchronously
          const promises = [];

          // Regular properties
          for (const key in data) {
            if (key === "__symbols__") continue;
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              promises.push(
                (async () => {
                  const value = await reviver(data[key]);
                  if (
                    value &&
                    typeof value === "object" &&
                    value.__pendingRef !== undefined
                  ) {
                    // This is a forward reference, register it for later resolution
                    const refId = value.__pendingRef;
                    if (!pendingRefs.has(refId)) {
                      pendingRefs.set(refId, []);
                    }
                    pendingRefs.get(refId)!.push({ obj: result, key });
                    // Set a temporary placeholder
                    (result as any)[key] = null;
                  } else {
                    (result as any)[key] = value;
                  }
                })(),
              );
            }
          }

          // Symbol properties
          if (data.__symbols__) {
            for (const keyDesc in data.__symbols__) {
              if (
                Object.prototype.hasOwnProperty.call(data.__symbols__, keyDesc)
              ) {
                promises.push(
                  (async () => {
                    const symKey = Symbol(keyDesc);
                    const value = await reviver(data.__symbols__[keyDesc]);
                    if (
                      value &&
                      typeof value === "object" &&
                      value.__pendingRef !== undefined
                    ) {
                      // This is a forward reference, register it for later resolution
                      const refId = value.__pendingRef;
                      if (!pendingRefs.has(refId)) {
                        pendingRefs.set(refId, []);
                      }
                      pendingRefs
                        .get(refId)!
                        .push({ obj: result, key: symKey });
                      // Set a temporary placeholder
                      (result as any)[symKey] = null;
                    } else {
                      (result as any)[symKey] = value;
                    }
                  })(),
                );
              }
            }
          }

          await Promise.all(promises);
          return result;
        }
        case "Function": {
          try {
            const result = new Function(`return ${data}`)();
            return registerWithRefs(id, result);
          } catch (e) {
            console.warn("Could not revive function:", e);
            const errorFn = () => {
              throw new Error("Function could not be revived properly");
            };
            return registerWithRefs(id, errorFn);
          }
        }
        case "Class": {
          if (
            classConstructors &&
            typeof data.className === "string" &&
            data.className in classConstructors
          ) {
            const ClassConstructor = classConstructors[data.className];
            try {
              // Create a new instance of the class
              const result = new ClassConstructor();

              // Register early for circular references
              if (id !== null) refs.set(id, result);

              // Copy properties to custom class instance
              if (data.properties) {
                // Process properties asynchronously - this was missing
                const propertyPromises = [];
                for (const key in data.properties) {
                  propertyPromises.push(
                    (async () => {
                      result[key] = await reviver(data.properties[key]);
                    })(),
                  );
                }
                await Promise.all(propertyPromises);
              }
              return result;
            } catch (e) {
              console.warn(`Could not revive class ${data.className}:`, e);
            }
          }

          // When constructor not available, create a dynamic class/function to preserve the class name
          try {
            // Create a dynamic constructor function with the proper name
            let DynamicClass;

            if (typeof data.className === "string" && data.className) {
              // dynamic class creation
              DynamicClass = new Function(`return class ${data.className} {
                  constructor() {}
                }`)();
            } else {
              // Use generic class if no valid name
              DynamicClass = Object;
            }

            // Create an instance
            const result = new DynamicClass();

            // Register reference early
            if (id !== null) refs.set(id, result);

            // Populate properties
            if (data.properties) {
              const propertyPromises = [];
              for (const key in data.properties) {
                propertyPromises.push(
                  (async () => {
                    result[key] = await reviver(data.properties[key]);
                  })(),
                );
              }
              await Promise.all(propertyPromises);
            }

            return result;
          } catch (e) {
            console.warn(
              `Failed to create dynamic class for ${data.className}:`,
              e,
            );

            // Last fallback: create a plain object
            const result: Record<string, any> = {};
            if (id !== null) refs.set(id, result);
            if (data.properties) {
              const propertyPromises = [];
              for (const key in data.properties) {
                propertyPromises.push(
                  (async () => {
                    result[key] = await reviver(data.properties[key]);
                  })(),
                );
              }
              await Promise.all(propertyPromises);
            }
            return result;
          }
        }

        case "SharedArrayBuffer": {
          if (typeof SharedArrayBuffer !== "undefined") {
            try {
              return createBinaryFromBase64(id, data, SharedArrayBuffer);
            } catch (e) {
              console.warn("SharedArrayBuffer is not available:", e);
              return createBinaryFromBase64(id, data, ArrayBuffer);
            }
          } else {
            console.warn("SharedArrayBuffer not supported");
            return _registerWithRefs(refs, id, _base64ToBinary(data));
          }
        }
        case "ArrayBuffer":
          return registerWithRefs(id, _base64ToBinary(data));
        case "DataView": {
          const buffer = _base64ToBinary(data.buffer);
          const result = new DataView(buffer, data.byteOffset, data.byteLength);
          return registerWithRefs(id, result);
        }
        case "File": {
          // Create a File object with actual content
          if (typeof File !== "undefined") {
            try {
              // Use actual data if available
              let content: Uint8Array;
              if (data.data) {
                const buffer = _base64ToBinary(data.data);
                content = new Uint8Array(buffer);
              } else {
                content = new Uint8Array(0);
              }

              const file = new File(
                [new Blob([content], { type: data.type })],
                data.name,
                {
                  type: data.type,
                  lastModified: data.lastModified,
                },
              );
              return registerWithRefs(id, file);
            } catch (e) {
              console.warn("Failed to recreate File:", e);
            }
          }

          // Fallback if File can't be created
          return registerWithRefs(id, {
            __fileRef: true,
            name: data.name,
            type: data.type,
            size: data.size,
            lastModified: data.lastModified,
            hasData: !!data.data,
          });
        }

        case "FileList": {
          if (typeof File !== "undefined") {
            try {
              // Create File objects from serialized data
              const filePromises = data.map(async (fileData: any) => {
                // If reference exists, use it
                if (fileData.id !== undefined && refs.has(fileData.id)) {
                  return refs.get(fileData.id);
                }

                // Create new File with content if available
                let content: Uint8Array;
                if (fileData.data) {
                  const buffer = _base64ToBinary(fileData.data);
                  content = new Uint8Array(buffer);
                } else {
                  content = new Uint8Array(0);
                }

                const file = new File(
                  [new Blob([content], { type: fileData.type })],
                  fileData.name,
                  {
                    type: fileData.type,
                    lastModified: fileData.lastModified,
                  },
                );

                // Register with original ID if provided
                if (fileData.id !== undefined) {
                  refs.set(fileData.id, file);
                }

                return file;
              });

              const fileObjects = await Promise.all(filePromises);

              // Create FileList-like object with proper indexing
              // Use an interface to ensure TypeScript recognizes the numeric indexing
              interface FileListLike {
                [index: number]: File;
                length: number;
                item: (index: number) => File | null;
                [Symbol.iterator]: () => IterableIterator<File>;
              }

              const fileListLike: FileListLike = {
                length: fileObjects.length,
                item: (index: number) => fileObjects[index] || null,
                [Symbol.iterator]: function* () {
                  yield* fileObjects;
                },
              } as FileListLike;

              // Make it array-like
              for (let i = 0; i < fileObjects.length; i++) {
                fileListLike[i] = fileObjects[i];
              }

              return registerWithRefs(id, fileListLike);
            } catch (e) {
              console.warn("Failed to recreate FileList:", e);
            }
          }

          // Fallback for environments without File support
          return registerWithRefs(id, {
            __fileListRef: true,
            files: await Promise.all(data.map((item: any) => reviver(item))),
          });
        }

        case "FormData": {
          if (typeof FormData !== "undefined") {
            try {
              const formData = new FormData();

              // Process all entries
              const entryPromises = Object.keys(data).map(async (key) => {
                const val = data[key];

                // Handle file references
                if (val && val._type === "FileRef" && val._id !== undefined) {
                  if (refs.has(val._id)) {
                    formData.append(key, refs.get(val._id));
                  } else {
                    console.warn(`File reference ${val._id} not found`);
                  }
                }
                // Handle FileList references
                else if (
                  val &&
                  val._type === "FileListRef" &&
                  val._id !== undefined
                ) {
                  if (refs.has(val._id)) {
                    const fileList = refs.get(val._id);
                    // Add each file from the FileList
                    for (let i = 0; i < fileList.length; i++) {
                      formData.append(key, fileList[i]);
                    }
                  } else {
                    console.warn(`FileList reference ${val._id} not found`);
                  }
                }
                // Handle inline file data
                else if (
                  val &&
                  val._type === "File" &&
                  typeof File !== "undefined"
                ) {
                  let content: Uint8Array;
                  if (val.data) {
                    const buffer = _base64ToBinary(val.data);
                    content = new Uint8Array(buffer);
                  } else {
                    content = new Uint8Array(0);
                  }

                  const file = new File(
                    [new Blob([content], { type: val.type })],
                    val.name,
                    {
                      type: val.type,
                      lastModified: val.lastModified,
                    },
                  );
                  formData.append(key, file);
                }
                // Handle regular values
                else {
                  formData.append(key, await reviver(val));
                }
              });

              // Wait for all entries to be processed
              await Promise.all(entryPromises);
              return registerWithRefs(id, formData);
            } catch (e) {
              console.warn("Failed to recreate FormData:", e);
            }
          }

          // Fallback for environments without FormData
          return registerWithRefs(id, {
            __formDataRef: true,
            entries: await reviver(data),
          });
        }

        case "Headers": {
          const headers = new Headers();
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              headers.append(key, data[key]);
            }
          }
          return registerWithRefs(id, headers);
        }

        case "Canvas": {
          const canvas = document.createElement("canvas");
          canvas.width = data.width;
          canvas.height = data.height;

          // Load the image data if available
          if (data.dataURL) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const img = new Image();
              img.src = data.dataURL;
              // This is synchronous, but creates an empty canvas first
              // To properly load the image, you'd need async functionality
              ctx.drawImage(img, 0, 0);
            }
          }
          return registerWithRefs(id, canvas);
        }

        case "ImageData": {
          const buffer = _base64ToBinary(data.data);
          const uint8Array = new Uint8Array(buffer);
          const clampedArray = new Uint8ClampedArray(uint8Array);
          const imageData = new ImageData(
            clampedArray,
            data.width,
            data.height,
            { colorSpace: data.colorSpace },
          );
          return registerWithRefs(id, imageData);
        }
        case "CSSStyleSheet": {
          const stylesheet = new CSSStyleSheet();
          stylesheet.replaceSync(data);
          return registerWithRefs(id, stylesheet);
        }

        case "Element": {
          // Use the safeCreateElement helper and check for document availability
          if (!isGlobalType("document") || !windowObj?.document) {
            console.warn("Cannot create Element: document not available");
            return registerWithRefs(id, {});
          }

          const element = safeCreateElement(data.tagName);
          if (!element) {
            console.warn(`Failed to create element with tag '${data.tagName}'`);
            return registerWithRefs(id, {});
          }

          // Add attributes
          if (data.attributes) {
            for (const name in data.attributes) {
              if (Object.prototype.hasOwnProperty.call(data.attributes, name)) {
                element.setAttribute(name, data.attributes[name]);
              }
            }
          }

          // Set inner HTML
          element.innerHTML = data.innerHTML || "";
          return registerWithRefs(id, element);
        }

        case "Text": {
          if (!isGlobalType("document") || !windowObj?.document) {
            console.warn("Cannot create Text node: document not available");
            return registerWithRefs(id, "");
          }

          try {
            // Use DOM API to create text node
            const textNode = windowObj.document.createTextNode(data || "");
            return registerWithRefs(id, textNode);
          } catch (e) {
            console.warn("Failed to create Text node:", e);
            return registerWithRefs(id, "");
          }
        }

        case "Comment": {
          if (!isGlobalType("document") || !windowObj?.document) {
            console.warn("Cannot create Comment node: document not available");
            return registerWithRefs(id, "");
          }

          try {
            const commentNode = windowObj.document.createComment(data || "");
            return registerWithRefs(id, commentNode);
          } catch (e) {
            console.warn("Failed to create Comment node:", e);
            return registerWithRefs(id, "");
          }
        }

        case "NodeList": {
          if (!isGlobalType("document") || !windowObj?.document) {
            console.warn("Cannot recreate NodeList: document not available");
            return registerWithRefs(id, {
              __nodeListRef: true,
              nodes: await Promise.all(data.map((item: any) => reviver(item))),
            });
          }

          try {
            // Create DOM nodes from serialized data
            const nodePromises = data.map(async (nodeData: any) => {
              // If reference exists, use it
              if (nodeData.id !== undefined && refs.has(nodeData.id)) {
                return refs.get(nodeData.id);
              }

              let node;
              try {
                if (nodeData.type === "Element") {
                  // Use safeCreateElement helper
                  node = safeCreateElement(nodeData.tagName);

                  if (node) {
                    // Add attributes
                    if (nodeData.attributes) {
                      for (const name in nodeData.attributes) {
                        if (
                          Object.prototype.hasOwnProperty.call(
                            nodeData.attributes,
                            name,
                          )
                        ) {
                          node.setAttribute(name, nodeData.attributes[name]);
                        }
                      }
                    }

                    node.innerHTML = nodeData.innerHTML || "";
                  } else {
                    // Fallback if element creation failed
                    node = windowObj.document.createComment(
                      `Failed to create ${nodeData.tagName} element`,
                    );
                  }
                } else if (nodeData.type === "Text") {
                  // Use DOM API to create text node
                  node = windowObj.document.createTextNode(nodeData.data || "");
                } else if (nodeData.type === "Comment") {
                  node = windowObj.document.createComment(nodeData.data || "");
                } else {
                  // Create a placeholder for unknown node types
                  node = windowObj.document.createComment(
                    `Unknown node type: ${nodeData.type}`,
                  );
                }
              } catch (e) {
                console.warn(`Failed to create ${nodeData.type} node:`, e);
                // Fallback to comment node
                node = windowObj.document.createComment(
                  `Failed to create ${nodeData.type} node`,
                );
              }

              // Register with original ID if provided
              if (nodeData.id !== undefined) {
                refs.set(nodeData.id, node);
              }
              return node;
            });

            const nodeObjects = await Promise.all(nodePromises);

            // Create NodeList-like object with proper indexing
            interface NodeListLike {
              [index: number]: Node;
              length: number;
              item: (index: number) => Node | null;
              [Symbol.iterator]: () => IterableIterator<Node>;
            }

            const nodeListLike: NodeListLike = {
              length: nodeObjects.length,
              item: (index: number) => nodeObjects[index] || null,
              [Symbol.iterator]: function* () {
                yield* nodeObjects;
              },
            } as NodeListLike;

            // Make it array-like
            for (let i = 0; i < nodeObjects.length; i++) {
              nodeListLike[i] = nodeObjects[i];
            }

            return registerWithRefs(id, nodeListLike);
          } catch (e) {
            console.warn("Failed to recreate NodeList:", e);
          }

          // Fallback for environments without DOM support
          return registerWithRefs(id, {
            __nodeListRef: true,
            nodes: await Promise.all(data.map((item: any) => reviver(item))),
          });
        }
      }
    }

    // Default handling for arrays
    if (Array.isArray(value)) {
      const result = new Array(value.length);
      const promises = value.map(async (item, i) => {
        result[i] = await reviver(item);
      });
      await Promise.all(promises);
      return result;
    }

    // Process regular objects
    const result: Record<string, any> = {};
    const promises = [];
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        promises.push(
          (async () => {
            result[key] = await reviver(value[key]);
          })(),
        );
      }
    }

    await Promise.all(promises);
    return result;
  }

  try {
    const parsed = JSON.parse(serialized);
    return await reviver(parsed);
  } catch (e) {
    console.error("DSON parse error:", e);
    throw e; // Re-throw the error instead of returning null
  }
}
