/**
 * Transformer that checks if a value is truthy.
 * Returns true for all truthy values (non-zero numbers, non-empty strings, objects, etc.)
 */
export const isTruthy = (value: any): boolean => {
  return !!value;
};
