export const asArray = (value: any, transformerFn: (value: any) => any) => {
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
