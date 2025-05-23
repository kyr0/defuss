import type { ValidatorPrimitiveFn } from "../index.js";

export const isUrlPath: ValidatorPrimitiveFn = (value: string) =>
  typeof value === "string" && value !== "" && /^[a-z0-9-_\/]+$/.test(value);
