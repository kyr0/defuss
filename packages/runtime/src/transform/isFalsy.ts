/**
 * Transformer that checks if a value is falsy.
 * Returns true for all falsy values (false, 0, "", null, undefined, NaN)
 */
export const isFalsy = (value: any): boolean => {
  return !value;
};
