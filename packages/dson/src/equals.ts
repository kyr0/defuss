import { parse } from "./parse.js";
import { stringify } from "./stringify.js";

export async function isEqual(objectA: any, objectB: any): Promise<boolean> {
  const serializedA = await stringify(objectA);
  const normalizedA = await parse(serializedA);

  const serializedB = await stringify(objectB);
  const normalizedB = await parse(serializedB);

  return (await stringify(normalizedA)) === (await stringify(normalizedB));
}
