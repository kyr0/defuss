export const isTypeOf = <T>(value: any, type: T): boolean => {
  if (type === "string") {
    return typeof value === "string";
  } else if (type === "number") {
    return typeof value === "number";
  } else if (type === "boolean") {
    return typeof value === "boolean";
  } else if (type === "object") {
    return typeof value === "object" && value !== null;
  } else if (type === "function") {
    return typeof value === "function";
  } else if (type === "undefined") {
    return typeof value === "undefined";
  }
  return false;
};
