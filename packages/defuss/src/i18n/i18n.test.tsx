// @vitest-environment happy-dom
import { createI18n, i18n } from "./i18n.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("i18n core functionality", () => {
  let testI18n: ReturnType<typeof createI18n>;

  beforeEach(() => {
    testI18n = createI18n();
  });

  describe("createI18n", () => {
    it("should create a new i18n instance", () => {
      expect(testI18n).toBeDefined();
      expect(testI18n.language).toBe("en");
      expect(typeof testI18n.changeLanguage).toBe("function");
      expect(typeof testI18n.t).toBe("function");
      expect(typeof testI18n.loadLanguage).toBe("function");
      expect(typeof testI18n.subscribe).toBe("function");
    });

    it("should have default language as 'en'", () => {
      expect(testI18n.language).toBe("en");
    });
  });

  describe("load", () => {
    it("should load translations for a language", () => {
      testI18n.loadLanguage("en", {
        greeting: "Hello, {name}!",
        farewell: "Goodbye!",
      });

      expect(testI18n.t("greeting", { name: "John" })).toBe("Hello, John!");
      expect(testI18n.t("farewell")).toBe("Goodbye!");
    });

    it("should merge translations when loading multiple times", () => {
      testI18n.loadLanguage("en", { greeting: "Hello!" });
      testI18n.loadLanguage("en", { farewell: "Goodbye!" });

      expect(testI18n.t("greeting")).toBe("Hello!");
      expect(testI18n.t("farewell")).toBe("Goodbye!");
    });

    it("should override existing translations when loading with same key", () => {
      testI18n.loadLanguage("en", { greeting: "Hello!" });
      testI18n.loadLanguage("en", { greeting: "Hi there!" });

      expect(testI18n.t("greeting")).toBe("Hi there!");
    });

    it("should support nested translation objects", () => {
      testI18n.loadLanguage("en", {
        common: {
          buttons: {
            save: "Save",
            cancel: "Cancel",
          },
        },
      });

      expect(testI18n.t("common.buttons.save")).toBe("Save");
      expect(testI18n.t("common.buttons.cancel")).toBe("Cancel");
    });
  });

  describe("changeLanguage", () => {
    beforeEach(() => {
      testI18n.loadLanguage("en", { greeting: "Hello!" });
      testI18n.loadLanguage("de", { greeting: "Hallo!" });
      testI18n.loadLanguage("es", { greeting: "¡Hola!" });
    });

    it("should change the current language", () => {
      testI18n.changeLanguage("de");
      expect(testI18n.language).toBe("de");
      expect(testI18n.t("greeting")).toBe("Hallo!");
    });

    it("should update language and affect translations", () => {
      expect(testI18n.t("greeting")).toBe("Hello!");

      testI18n.changeLanguage("es");
      expect(testI18n.t("greeting")).toBe("¡Hola!");
    });

    it("should call language change callbacks", () => {
      let callback1Result = "";
      let callback2Result = "";

      testI18n.subscribe((lang) => {
        callback1Result = lang;
      });
      testI18n.subscribe((lang) => {
        callback2Result = lang;
      });

      testI18n.changeLanguage("de");

      expect(callback1Result).toBe("de");
      expect(callback2Result).toBe("de");
    });
  });

  describe("t (translation)", () => {
    beforeEach(() => {
      testI18n.loadLanguage("en", {
        greeting: "Hello, {name}!",
        farewell: "Goodbye, {name}!",
        complex: "Welcome {name}, you have {count} messages and {items} items.",
        simple: "Simple message",
        nested: {
          deep: {
            message: "Deep nested message with {value}",
          },
        },
      });
    });

    it("should return simple translation without placeholders", () => {
      expect(testI18n.t("simple")).toBe("Simple message");
    });

    it("should interpolate single placeholder", () => {
      expect(testI18n.t("greeting", { name: "John" })).toBe("Hello, John!");
    });

    it("should interpolate multiple placeholders", () => {
      expect(
        testI18n.t("complex", { name: "Alice", count: "5", items: "10" }),
      ).toBe("Welcome Alice, you have 5 messages and 10 items.");
    });

    it("should handle missing placeholders gracefully", () => {
      expect(testI18n.t("greeting")).toBe("Hello, {name}!");
    });

    it("should handle extra placeholders gracefully", () => {
      expect(testI18n.t("simple", { extra: "value" })).toBe("Simple message");
    });

    it("should return translation key when translation is missing", () => {
      expect(testI18n.t("missing.key")).toBe("missing.key");
    });

    it("should handle nested translation keys", () => {
      expect(testI18n.t("nested.deep.message", { value: "test" })).toBe(
        "Deep nested message with test",
      );
    });

    it("should work without replacements parameter", () => {
      expect(testI18n.t("simple")).toBe("Simple message");
    });

    it("should handle empty replacements object", () => {
      expect(testI18n.t("greeting", {})).toBe("Hello, {name}!");
    });
  });

  describe("subscribe", () => {
    it("should add language change listener", () => {
      let callbackResult = "";
      testI18n.subscribe((lang) => {
        callbackResult = lang;
      });

      testI18n.changeLanguage("de");
      expect(callbackResult).toBe("de");
    });

    it("should support multiple subscribers", () => {
      let callback1Result = "";
      let callback2Result = "";
      let callback3Result = "";

      testI18n.subscribe((lang) => {
        callback1Result = lang;
      });
      testI18n.subscribe((lang) => {
        callback2Result = lang;
      });
      testI18n.subscribe((lang) => {
        callback3Result = lang;
      });

      testI18n.changeLanguage("fr");

      expect(callback1Result).toBe("fr");
      expect(callback2Result).toBe("fr");
      expect(callback3Result).toBe("fr");
    });

    it("should return unsubscribe function", () => {
      let callbackResult = "";
      const unsubscribe = testI18n.subscribe((lang) => {
        callbackResult = lang;
      });

      expect(typeof unsubscribe).toBe("function");

      testI18n.changeLanguage("de");
      expect(callbackResult).toBe("de");

      callbackResult = "";
      unsubscribe();

      testI18n.changeLanguage("es");
      expect(callbackResult).toBe("");
    });

    it("should handle unsubscribe with multiple subscribers", () => {
      let callback1Result = "";
      let callback2Result = "";
      let callback3Result = "";

      const unsubscribe1 = testI18n.subscribe((lang) => {
        callback1Result = lang;
      });
      testI18n.subscribe((lang) => {
        callback2Result = lang;
      });
      const unsubscribe3 = testI18n.subscribe((lang) => {
        callback3Result = lang;
      });

      testI18n.changeLanguage("de");
      expect(callback1Result).toBe("de");
      expect(callback2Result).toBe("de");
      expect(callback3Result).toBe("de");

      // Reset results
      callback1Result = "";
      callback2Result = "";
      callback3Result = "";

      // Unsubscribe first and third
      unsubscribe1();
      unsubscribe3();

      testI18n.changeLanguage("es");
      expect(callback1Result).toBe("");
      expect(callback2Result).toBe("es");
      expect(callback3Result).toBe("");
    });
  });

  describe("integration tests", () => {
    it("should handle complete workflow", () => {
      let languageChangeResult = "";
      testI18n.subscribe((lang) => {
        languageChangeResult = lang;
      });

      // Load translations
      testI18n.loadLanguage("en", {
        welcome: "Welcome, {name}!",
        goodbye: "Goodbye!",
      });
      testI18n.loadLanguage("de", {
        welcome: "Willkommen, {name}!",
        goodbye: "Auf Wiedersehen!",
      });

      // Test English
      expect(testI18n.t("welcome", { name: "Alice" })).toBe("Welcome, Alice!");
      expect(testI18n.t("goodbye")).toBe("Goodbye!");

      // Change to German
      testI18n.changeLanguage("de");
      expect(languageChangeResult).toBe("de");
      expect(testI18n.t("welcome", { name: "Alice" })).toBe(
        "Willkommen, Alice!",
      );
      expect(testI18n.t("goodbye")).toBe("Auf Wiedersehen!");
    });

    it("should handle language with no translations", () => {
      testI18n.loadLanguage("en", { message: "Hello" });
      testI18n.changeLanguage("fr"); // No French translations loaded

      expect(testI18n.t("message")).toBe("message");
    });
  });

  describe("singleton i18n instance", () => {
    afterEach(() => {
      // Reset singleton state
      i18n.changeLanguage("en");
    });

    it("should provide working singleton instance", () => {
      i18n.loadLanguage("test", { message: "Test message" });
      i18n.changeLanguage("test");

      expect(i18n.t("message")).toBe("Test message");
    });
    describe("edge cases and error handling", () => {
      it("should handle null and undefined values gracefully", () => {
        testI18n.loadLanguage("en", {
          message: "Hello {name}",
          count: "You have {count} items",
        });

        expect(testI18n.t("message", { name: "null" })).toBe("Hello null");
        expect(testI18n.t("message", { name: "undefined" })).toBe(
          "Hello undefined",
        );
        expect(testI18n.t("count", { count: "0" })).toBe("You have 0 items");
      });

      it("should handle special characters in translation keys", () => {
        testI18n.loadLanguage("en", {
          "special-key": "Special message",
          key_with_underscores: "Underscore message",
          "key.with.dots": "Dotted message",
          "123numeric": "Numeric key message",
        });

        expect(testI18n.t("special-key")).toBe("Special message");
        expect(testI18n.t("key_with_underscores")).toBe("Underscore message");
        expect(testI18n.t("key.with.dots")).toBe("Dotted message");
        expect(testI18n.t("123numeric")).toBe("Numeric key message");
      });

      it("should handle very deep nested objects", () => {
        testI18n.loadLanguage("en", {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    message: "Very deep message with {value}",
                  },
                },
              },
            },
          },
        });

        expect(
          testI18n.t("level1.level2.level3.level4.level5.message", {
            value: "test",
          }),
        ).toBe("Very deep message with test");
      });

      it("should handle malformed nested key paths", () => {
        testI18n.loadLanguage("en", {
          valid: {
            nested: "Valid nested message",
          },
        });

        expect(testI18n.t("valid.nested.nonexistent")).toBe(
          "valid.nested.nonexistent",
        );
        expect(testI18n.t("valid.nonexistent.path")).toBe(
          "valid.nonexistent.path",
        );
        expect(testI18n.t("")).toBe("");
        expect(testI18n.t(".")).toBe(".");
        expect(testI18n.t("..")).toBe("..");
      });

      it("should handle large translation objects", () => {
        const largeTranslations: Record<string, string> = {};
        for (let i = 0; i < 1000; i++) {
          largeTranslations[`key${i}`] = `Message ${i} with {value}`;
        }

        testI18n.loadLanguage("en", largeTranslations);

        expect(testI18n.t("key0", { value: "test" })).toBe(
          "Message 0 with test",
        );
        expect(testI18n.t("key500", { value: "middle" })).toBe(
          "Message 500 with middle",
        );
        expect(testI18n.t("key999", { value: "end" })).toBe(
          "Message 999 with end",
        );
      });

      it("should handle complex placeholder patterns", () => {
        testI18n.loadLanguage("en", {
          complex: "Start {var1} middle {var2} end {var3}",
          adjacent: "{first}{second}{third}",
          repeated: "{name} said '{name}' to {name}",
          nested_braces: "Value is {{wrapped}}",
          special_chars: "Email: {email}, URL: {url}, Price: ${price}",
        });

        expect(testI18n.t("complex", { var1: "A", var2: "B", var3: "C" })).toBe(
          "Start A middle B end C",
        );

        expect(
          testI18n.t("adjacent", { first: "1", second: "2", third: "3" }),
        ).toBe("123");

        expect(testI18n.t("repeated", { name: "John" })).toBe(
          "John said 'John' to John",
        );

        expect(testI18n.t("nested_braces", { wrapped: "content" })).toBe(
          "Value is {content}",
        );

        expect(
          testI18n.t("special_chars", {
            email: "test@example.com",
            url: "https://example.com",
            price: "99.99",
          }),
        ).toBe(
          "Email: test@example.com, URL: https://example.com, Price: $99.99",
        );
      });
    });

    describe("real-world application scenarios", () => {
      beforeEach(() => {
        // E-commerce application translations
        testI18n.loadLanguage("en", {
          header: {
            navigation: {
              home: "Home",
              products: "Products",
              cart: "Cart ({count})",
              account: "My Account",
            },
          },
          product: {
            details: {
              price: "${price}",
              stock: "{count} in stock",
              rating: "Rated {stars} out of 5 ({reviews} reviews)",
              add_to_cart: "Add to Cart",
            },
            messages: {
              added: "Added {product} to cart",
              out_of_stock: "Sorry, {product} is out of stock",
              sale: "Save {discount}% - Limited time!",
            },
          },
          checkout: {
            summary: "Order total: ${total} (including ${tax} tax)",
            shipping: "Shipping to {address} - ${cost}",
            estimated_delivery: "Estimated delivery: {date}",
          },
          errors: {
            form: {
              required: "{field} is required",
              invalid_email: "Please enter a valid email address",
              password_weak: "Password must be at least {min} characters",
            },
            api: {
              network: "Connection failed. Please try again.",
              server: "Server error ({code}). Please contact support.",
              timeout: "Request timed out after {seconds} seconds",
            },
          },
        });

        testI18n.loadLanguage("es", {
          header: {
            navigation: {
              home: "Inicio",
              products: "Productos",
              cart: "Carrito ({count})",
              account: "Mi Cuenta",
            },
          },
          product: {
            details: {
              price: "${price}",
              stock: "{count} en stock",
              rating: "Calificado {stars} de 5 ({reviews} reseñas)",
              add_to_cart: "Agregar al Carrito",
            },
            messages: {
              added: "Agregado {product} al carrito",
              out_of_stock: "Lo sentimos, {product} está agotado",
              sale: "Ahorra {discount}% - ¡Tiempo limitado!",
            },
          },
          checkout: {
            summary:
              "Total del pedido: ${total} (incluyendo ${tax} de impuestos)",
            shipping: "Envío a {address} - ${cost}",
            estimated_delivery: "Entrega estimada: {date}",
          },
          errors: {
            form: {
              required: "{field} es requerido",
              invalid_email: "Por favor ingrese un email válido",
              password_weak:
                "La contraseña debe tener al menos {min} caracteres",
            },
            api: {
              network: "Conexión falló. Por favor intente de nuevo.",
              server:
                "Error del servidor ({code}). Por favor contacte soporte.",
              timeout: "Solicitud agotó tiempo después de {seconds} segundos",
            },
          },
        });
      });

      it("should handle e-commerce navigation", () => {
        expect(testI18n.t("header.navigation.home")).toBe("Home");
        expect(testI18n.t("header.navigation.cart", { count: "3" })).toBe(
          "Cart (3)",
        );

        testI18n.changeLanguage("es");
        expect(testI18n.t("header.navigation.home")).toBe("Inicio");
        expect(testI18n.t("header.navigation.cart", { count: "3" })).toBe(
          "Carrito (3)",
        );
      });

      it("should handle product information", () => {
        expect(testI18n.t("product.details.price", { price: "29.99" })).toBe(
          "$29.99",
        );
        expect(testI18n.t("product.details.stock", { count: "5" })).toBe(
          "5 in stock",
        );
        expect(
          testI18n.t("product.details.rating", {
            stars: "4.5",
            reviews: "127",
          }),
        ).toBe("Rated 4.5 out of 5 (127 reviews)");
      });

      it("should handle product messages", () => {
        expect(
          testI18n.t("product.messages.added", { product: "iPhone 15" }),
        ).toBe("Added iPhone 15 to cart");
        expect(testI18n.t("product.messages.sale", { discount: "20" })).toBe(
          "Save 20% - Limited time!",
        );
      });

      it("should handle checkout information", () => {
        expect(
          testI18n.t("checkout.summary", { total: "149.99", tax: "12.75" }),
        ).toBe("Order total: $149.99 (including $12.75 tax)");
        expect(
          testI18n.t("checkout.shipping", {
            address: "New York",
            cost: "9.99",
          }),
        ).toBe("Shipping to New York - $9.99");
      });

      it("should handle form validation errors", () => {
        expect(testI18n.t("errors.form.required", { field: "Email" })).toBe(
          "Email is required",
        );
        expect(testI18n.t("errors.form.password_weak", { min: "8" })).toBe(
          "Password must be at least 8 characters",
        );
      });

      it("should handle API errors", () => {
        expect(testI18n.t("errors.api.server", { code: "500" })).toBe(
          "Server error (500). Please contact support.",
        );
        expect(testI18n.t("errors.api.timeout", { seconds: "30" })).toBe(
          "Request timed out after 30 seconds",
        );
      });

      it("should handle complete language switching for e-commerce", () => {
        // Test English
        expect(
          testI18n.t("product.messages.out_of_stock", { product: "MacBook" }),
        ).toBe("Sorry, MacBook is out of stock");

        // Switch to Spanish
        testI18n.changeLanguage("es");
        expect(
          testI18n.t("product.messages.out_of_stock", { product: "MacBook" }),
        ).toBe("Lo sentimos, MacBook está agotado");
        expect(testI18n.t("errors.form.invalid_email")).toBe(
          "Por favor ingrese un email válido",
        );
      });
    });

    describe("concurrent usage scenarios", () => {
      it("should handle multiple language changes in sequence", () => {
        const languages = ["en", "es", "de", "fr", "en"];
        const results: string[] = [];

        testI18n.subscribe((lang) => results.push(lang));

        testI18n.loadLanguage("de", { message: "Hallo" });
        testI18n.loadLanguage("fr", { message: "Bonjour" });

        languages.forEach((lang) => testI18n.changeLanguage(lang));

        expect(results).toEqual(["es", "de", "fr", "en"]);
      });

      it("should handle rapid successive translations calls", () => {
        testI18n.loadLanguage("en", {
          msg1: "Message 1 with {value}",
          msg2: "Message 2 with {value}",
          msg3: "Message 3 with {value}",
        });

        const results = [];
        for (let i = 0; i < 100; i++) {
          results.push(
            testI18n.t(`msg${(i % 3) + 1}`, { value: i.toString() }),
          );
        }

        expect(results[0]).toBe("Message 1 with 0");
        expect(results[1]).toBe("Message 2 with 1");
        expect(results[2]).toBe("Message 3 with 2");
        expect(results[99]).toBe("Message 1 with 99");
      });
    });

    describe("memory and performance scenarios", () => {
      it("should handle loading and overriding translations multiple times", () => {
        for (let i = 0; i < 10; i++) {
          testI18n.loadLanguage("en", {
            dynamic: `Dynamic message ${i} with {value}`,
            static: "Static message",
          });
        }

        expect(testI18n.t("dynamic", { value: "test" })).toBe(
          "Dynamic message 9 with test",
        );
        expect(testI18n.t("static")).toBe("Static message");
      });

      it("should handle many subscribers and unsubscribes", () => {
        const unsubscribes: Array<() => void> = [];

        // Add 50 subscribers
        for (let i = 0; i < 50; i++) {
          const callback = (lang: string) => {
            /* no-op */
          };
          unsubscribes.push(testI18n.subscribe(callback));
        }

        // Unsubscribe half of them
        for (let i = 0; i < 25; i++) {
          unsubscribes[i]();
        }

        // Should not throw any errors
        testI18n.changeLanguage("test");
        expect(testI18n.language).toBe("test");
      });
    });
  });
});
