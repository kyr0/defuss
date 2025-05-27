export const asDate = (value: any): Date => {
  if (value === null || value === undefined) return new Date(Number.NaN);
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(Number.NaN) : date;
};
