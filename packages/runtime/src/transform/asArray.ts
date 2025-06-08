import type { TransformerFn } from "./types.js";

/**
 * Converts a value to an array representation.
 * If the value is already an array, it applies a transformer function to each element.
 * If the value is null or undefined, it returns an empty array.
 * Otherwise, it applies the transformer function to the value and returns it as a single-element array.
 *
 * @param value - The value to convert to an array.
 * @param transformerFn - A function to transform each element of the array.
 * @returns An array representation of the value.
 */
export const asArray: TransformerFn = (
  value: any,
  transformerFn: (value: any) => any,
) => {
  if (Array.isArray(value)) {
    return value.map(transformerFn);
  }

  if (value === null || value === undefined) {
    return [];
  }

  const transformedValue = transformerFn(value);
  return Array.isArray(transformedValue)
    ? transformedValue
    : [transformedValue];
};
