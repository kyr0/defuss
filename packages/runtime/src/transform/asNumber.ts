export const asNumber = (value: any): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return 0;
};
