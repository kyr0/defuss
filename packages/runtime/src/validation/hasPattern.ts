export const hasPattern = (value: any, pattern: RegExp): boolean => {
  if (typeof value !== "string") return false;
  return pattern.test(value);
};
