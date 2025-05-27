import { equalsJSON } from "../datatype/index.js";

export const isEqual = (value: any, valueB: any): boolean =>
  equalsJSON(value, valueB);
