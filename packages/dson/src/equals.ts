import { parse } from "./json.js";
import { stringify } from "./json.js";

export function isEqual(objectA: any, objectB: any): boolean {
  const serializedA = stringify(objectA);
  const normalizedA = parse(serializedA);

  const serializedB = stringify(objectB);
  const normalizedB = parse(serializedB);

  return stringify(normalizedA) === stringify(normalizedB);
}
