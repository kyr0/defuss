export const isShorterThan = (
  value: any,
  maxLength: number,
  includeEqual = false,
): boolean => {
  if (typeof value !== "string") return false;
  return includeEqual ? value.length <= maxLength : value.length < maxLength;
};
