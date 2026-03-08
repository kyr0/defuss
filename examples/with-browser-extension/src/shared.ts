let sequence = 0;
export const getNextId = (namespace: string) => {
  ++sequence;
  return `${namespace}-${Math.random() * 100000}-${Date.now()}-${sequence}`;
};
