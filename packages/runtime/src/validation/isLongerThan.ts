export const isLongerThan = (
  value: any,
  minLength: number,
  includeEqual = false,
): boolean => {
  if (typeof value !== "string") return false;
  return includeEqual ? value.length >= minLength : value.length > minLength;
};
