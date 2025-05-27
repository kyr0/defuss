export const asBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowerValue = value.toLowerCase();
    return (
      lowerValue === "true" ||
      lowerValue === "1" ||
      lowerValue === "yes" ||
      lowerValue === "on"
    );
  }
  if (typeof value === "number") return value !== 0;
  return Boolean(value);
};
