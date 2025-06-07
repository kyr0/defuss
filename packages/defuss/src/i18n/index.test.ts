import { i18n, Trans, createI18n } from "./index.js";
import { describe, it, expect, beforeEach } from "vitest";

describe("i18n API interface/contract", () => {
  beforeEach(() => {
    globalThis.__defuss_i18n = undefined;
  });

  it("should create a new i18n instance", () => {
    const i18nInstance = createI18n();
    expect(i18nInstance).toBeDefined();
    expect(i18nInstance.language).toBe("en");
  });

  it("should change language", () => {
    const i18nInstance = createI18n();
    i18nInstance.changeLanguage("fr");
    expect(i18nInstance.language).toBe("fr");
  });

  it("should translate a string with no replacements", () => {
    const i18nInstance = createI18n();
    i18nInstance.loadLanguage("en", { greeting: "Hello" });
    expect(i18nInstance.t("greeting")).toBe("Hello");
  });

  it("should translate a string with replacements", () => {
    const i18nInstance = createI18n();
    i18nInstance.loadLanguage("en", { greeting: "Hello, {name}!" });
    expect(i18nInstance.t("greeting", { name: "Alice" })).toBe("Hello, Alice!");
  });

  it("should handle double braces in translations", () => {
    const i18nInstance = createI18n();
    i18nInstance.loadLanguage("en", { greeting: "Hello, {{name}}!" });
    expect(i18nInstance.t("greeting", { name: "Alice" })).toBe(
      "Hello, {Alice}!",
    );
  });

  it("should subscribe to language changes", () => {
    const i18nInstance = createI18n();
    const callback = vi.fn();
    const unsubscribe = i18nInstance.subscribe(callback);

    i18nInstance.changeLanguage("fr");

    expect(callback).toHaveBeenCalledWith("fr");

    unsubscribe();

    i18nInstance.changeLanguage("de");

    expect(callback).toHaveBeenCalledTimes(1); // should not be called again
  });
});
