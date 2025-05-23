export const _registerWithRefs = <T>(
  refs: Map<number, any>,
  id: number | null,
  value: T,
): T => {
  if (id !== null) {
    refs.set(id, value);
  }
  return value;
};
