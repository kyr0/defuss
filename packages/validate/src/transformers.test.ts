import { transformers } from "./transformers.js";

describe("Supported transformers", () => {
  it("should export all transformer functions", () => {
    expect(transformers).toEqual(
      expect.objectContaining({
        asArray: transformers.asArray,
        asBoolean: transformers.asBoolean,
        asDate: transformers.asDate,
        asInteger: transformers.asInteger,
        asNumber: transformers.asNumber,
        asString: transformers.asString,
      }),
    );
  });
});
