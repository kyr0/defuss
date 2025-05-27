export const isInstanceOf = <T extends new (...args: any[]) => any>(
  value: any,
  someConstructorFunction: T,
) => {
  if (typeof someConstructorFunction !== "function") {
    throw new TypeError("Expected a constructor function");
  }
  return (
    value instanceof someConstructorFunction &&
    value.constructor === someConstructorFunction
  );
};
