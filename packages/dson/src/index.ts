import { clone } from "./clone.js";
import { isEqual } from "./equals.js";
import { parse } from "./parse.js";
import { stringify } from "./stringify.js";

export const DSON = {
  parse,
  stringify,
  isEqual,
  clone,
};
