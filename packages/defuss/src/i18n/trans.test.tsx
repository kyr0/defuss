// @vitest-environment happy-dom
import { Trans, type TransRef } from "./trans.js";
import { i18n } from "./i18n.js";
import { describe, it, expect, beforeEach } from "vitest";
import { createRef, render } from "../render/client.js";

describe("Trans component", () => {
  const { load, changeLanguage } = i18n;

  beforeEach(() => {
    // Reset to English and clear any existing translations
    changeLanguage("en");

    load("en", {
      greeting: "Hello, {name}!",
      farewell: "Goodbye, {name}!",
      simple: "Simple message",
      complex: "You have {count} messages and {items} items",
      nested: {
        deep: {
          message: "Deep message with {value}",
        },
      },
    });

    load("de", {
      greeting: "Hallo, {name}!",
      farewell: "Auf Wiedersehen, {name}!",
      simple: "Einfache Nachricht",
      complex: "Sie haben {count} Nachrichten und {items} Artikel",
      nested: {
        deep: {
          message: "Tiefe Nachricht mit {value}",
        },
      },
    });

    load("es", {
      greeting: "¡Hola, {name}!",
      farewell: "¡Adiós, {name}!",
      simple: "Mensaje simple",
    });
  });

  describe("basic rendering", () => {
    it("should render translation with interpolation", async () => {
      const container = await render(
        <Trans key="greeting" values={{ name: "John" }} />,
      );
      expect(container.textContent).toBe("Hello, John!");
    });

    it("should render simple translation without values", async () => {
      const container = await render(<Trans key="simple" />);
      expect(container.textContent).toBe("Simple message");
    });

    it("should render translation with multiple placeholders", async () => {
      const container = await render(
        <Trans key="complex" values={{ count: "5", items: "10" }} />,
      );
      expect(container.textContent).toBe("You have 5 messages and 10 items");
    });

    it("should render nested translation keys", async () => {
      const container = await render(
        <Trans key="nested.deep.message" values={{ value: "test" }} />,
      );
      expect(container.textContent).toBe("Deep message with test");
    });
  });

  describe("language switching", () => {
    it("should update when language changes", async () => {
      const container = await render(
        <Trans key="greeting" values={{ name: "Alice" }} />,
      );
      expect(container.textContent).toBe("Hello, Alice!");

      changeLanguage("de");
      expect(container.textContent).toBe("Hallo, Alice!");

      changeLanguage("es");
      expect(container.textContent).toBe("¡Hola, Alice!");
    });

    it("should handle missing translations gracefully", async () => {
      changeLanguage("es"); // Spanish doesn't have 'complex' translation
      const container = await render(
        <Trans key="complex" values={{ count: "3", items: "7" }} />,
      );
      expect(container.textContent).toBe("complex");
    });
  });

  describe("edge cases", () => {
    it("should handle missing values gracefully", async () => {
      const container = await render(<Trans key="greeting" />);
      expect(container.textContent).toBe("Hello, {name}!");
    });

    it("should handle extra values gracefully", async () => {
      const container = await render(
        <Trans key="simple" values={{ extra: "value", another: "test" }} />,
      );
      expect(container.textContent).toBe("Simple message");
    });

    it("should handle empty values object", async () => {
      const container = await render(<Trans key="greeting" values={{}} />);
      expect(container.textContent).toBe("Hello, {name}!");
    });

    it("should handle non-existent translation key", async () => {
      const container = await render(<Trans key="nonexistent.key" />);
      expect(container.textContent).toBe("nonexistent.key");
    });

    it("should handle numeric values", async () => {
      const container = await render(
        <Trans key="complex" values={{ count: "42", items: "100" }} />,
      );
      expect(container.textContent).toBe("You have 42 messages and 100 items");
    });

    it("should handle boolean values", async () => {
      load("en", { status: "Active: {isActive}" });
      const container = await render(
        <Trans key="status" values={{ isActive: "true" }} />,
      );
      expect(container.textContent).toBe("Active: true");
    });
  });

  describe("real-world scenarios", () => {
    beforeEach(() => {
      load("en", {
        user: {
          profile: {
            welcome: "Welcome back, {username}!",
            stats:
              "You have {posts} posts, {followers} followers, and {following} following",
          },
          notifications: {
            new: "You have {count} new notifications",
            none: "No new notifications",
          },
        },
        errors: {
          network: "Network error: {message}",
          validation: "Validation failed for {field}",
        },
      });

      load("de", {
        user: {
          profile: {
            welcome: "Willkommen zurück, {username}!",
            stats:
              "Sie haben {posts} Beiträge, {followers} Follower und folgen {following}",
          },
          notifications: {
            new: "Sie haben {count} neue Benachrichtigungen",
            none: "Keine neuen Benachrichtigungen",
          },
        },
        errors: {
          network: "Netzwerkfehler: {message}",
          validation: "Validierung fehlgeschlagen für {field}",
        },
      });
    });

    it("should handle user profile welcome message", async () => {
      const container = await render(
        <Trans key="user.profile.welcome" values={{ username: "johndoe" }} />,
      );
      expect(container.textContent).toBe("Welcome back, johndoe!");
    });

    it("should handle complex user stats", async () => {
      const container = await render(
        <Trans
          key="user.profile.stats"
          values={{ posts: "25", followers: "150", following: "75" }}
        />,
      );
      expect(container.textContent).toBe(
        "You have 25 posts, 150 followers, and 75 following",
      );
    });

    it("should handle notifications", async () => {
      const newNotifs = await render(
        <Trans key="user.notifications.new" values={{ count: "3" }} />,
      );
      expect(newNotifs.textContent).toBe("You have 3 new notifications");

      const noNotifs = await render(<Trans key="user.notifications.none" />);
      expect(noNotifs.textContent).toBe("No new notifications");
    });

    it("should handle error messages", async () => {
      const networkError = await render(
        <Trans
          key="errors.network"
          values={{ message: "Connection timeout" }}
        />,
      );
      expect(networkError.textContent).toBe(
        "Network error: Connection timeout",
      );

      const validationError = await render(
        <Trans key="errors.validation" values={{ field: "email" }} />,
      );
      expect(validationError.textContent).toBe("Validation failed for email");
    });

    it("should work with German translations", async () => {
      changeLanguage("de");

      const container = await render(
        <Trans
          key="user.profile.welcome"
          values={{ username: "hansmueller" }}
        />,
      );
      expect(container.textContent).toBe("Willkommen zurück, hansmueller!");

      const stats = await render(
        <Trans
          key="user.profile.stats"
          values={{ posts: "10", followers: "50", following: "25" }}
        />,
      );
      expect(stats.textContent).toBe(
        "Sie haben 10 Beiträge, 50 Follower und folgen 25",
      );
    });
  });

  describe("performance and reactivity", () => {
    it("should re-render when translations are updated", async () => {
      const container = await render(
        <Trans key="greeting" values={{ name: "Alice" }} />,
      );
      expect(container.textContent).toBe("Hello, Alice!");

      // Update the translation
      load("en", { greeting: "Hi there, {name}!" });
      expect(container.textContent).toBe("Hi there, Alice!");
    });

    it("should handle rapid language changes", async () => {
      const container = await render(<Trans key="simple" />);

      expect(container.textContent).toBe("Simple message");

      changeLanguage("de");
      expect(container.textContent).toBe("Einfache Nachricht");

      changeLanguage("en");
      expect(container.textContent).toBe("Simple message");

      changeLanguage("es");
      expect(container.textContent).toBe("Mensaje simple");
    });
  });

  describe("component lifecycle and reactivity", () => {
    it("should re-render when i18n language changes", async () => {
      const container = await render(
        <Trans key="greeting" values={{ name: "Alice" }} />,
      );
      expect(container.textContent).toBe("Hello, Alice!");

      // Change language should trigger re-render
      changeLanguage("de");
      expect(container.textContent).toBe("Hallo, Alice!");

      changeLanguage("es");
      expect(container.textContent).toBe("¡Hola, Alice!");
    });

    it("should handle prop changes correctly", async () => {
      let container = await render(
        <Trans key="greeting" values={{ name: "John" }} />,
      );
      expect(container.textContent).toBe("Hello, John!");

      // Change props
      container = await render(
        <Trans key="farewell" values={{ name: "John" }} />,
      );
      expect(container.textContent).toBe("Goodbye, John!");

      // Change values
      container = await render(
        <Trans key="farewell" values={{ name: "Jane" }} />,
      );
      expect(container.textContent).toBe("Goodbye, Jane!");
    });
  });

  describe("accessibility and semantic rendering", async () => {
    it("should render as plain text without wrapper elements", async () => {
      const container = await render(<Trans key="simple" />);
      expect(container.children.length).toBe(0); // No wrapper elements
      expect(container.textContent).toBe("Simple message");
    });

    it("should handle long text content properly", async () => {
      load("en", {
        longText:
          "This is a very long message that contains multiple sentences. It should render properly without any issues. The component should handle {param} interpolation even in longer texts seamlessly.",
      });

      const container = await render(
        <Trans key="longText" values={{ param: "parameter" }} />,
      );

      expect(container.textContent).toContain("This is a very long message");
      expect(container.textContent).toContain("parameter interpolation");
      expect(container.textContent).toContain("seamlessly.");
    });

    it("should handle special characters and unicode", async () => {
      load("en", {
        unicode: "Unicode test: 你好 {name} 🌍 café naïve résumé",
        symbols: "Symbols: @#$%^&*()_+-=[]{}|;':\",./<>?",
        emojis: "Hello {name}! 😀 🎉 ✨ 🚀",
      });

      const unicode = await render(
        <Trans key="unicode" values={{ name: "世界" }} />,
      );
      expect(unicode.textContent).toBe(
        "Unicode test: 你好 世界 🌍 café naïve résumé",
      );

      const symbols = await render(<Trans key="symbols" />);
      expect(symbols.textContent).toBe(
        "Symbols: @#$%^&*()_+-=[]{}|;':\",./<>?",
      );

      const emojis = await render(
        <Trans key="emojis" values={{ name: "World" }} />,
      );
      expect(emojis.textContent).toBe("Hello World! 😀 🎉 ✨ 🚀");
    });
  });

  describe("integration with complex state scenarios", async () => {
    it("should work correctly in forms and interactive components", async () => {
      load("en", {
        form: {
          labels: {
            email: "Email Address",
            password: "Password",
            confirm: "Confirm Password",
          },
          validation: {
            required: "{field} is required",
            invalid: "Please enter a valid {field}",
            mismatch: "Passwords do not match",
          },
        },
      });

      load("fr", {
        form: {
          labels: {
            email: "Adresse Email",
            password: "Mot de Passe",
            confirm: "Confirmer le Mot de Passe",
          },
          validation: {
            required: "{field} est requis",
            invalid: "Veuillez saisir un {field} valide",
            mismatch: "Les mots de passe ne correspondent pas",
          },
        },
      });

      // Test English form
      const emailLabel = await render(<Trans key="form.labels.email" />);
      expect(emailLabel.textContent).toBe("Email Address");

      const requiredError = await render(
        <Trans key="form.validation.required" values={{ field: "Email" }} />,
      );
      expect(requiredError.textContent).toBe("Email is required");

      // Switch to French
      changeLanguage("fr");

      const emailLabelFr = await render(<Trans key="form.labels.email" />);
      expect(emailLabelFr.textContent).toBe("Adresse Email");

      const requiredErrorFr = await render(
        <Trans key="form.validation.required" values={{ field: "Email" }} />,
      );
      expect(requiredErrorFr.textContent).toBe("Email est requis");
    });

    it("should handle dynamic content updates", async () => {
      load("en", {
        status: "Status: {status}",
        counter: "Count: {count}",
      });

      load("de", {
        status: "Status: {status}",
        counter: "Anzahl: {count}",
      });
      const ref = createRef<string, HTMLElement>() as TransRef;

      const container = await render(
        <Trans key="status" values={{ status: "Loading" }} ref={ref} />,
      );
      expect(container.textContent).toBe("Status: Loading");

      ref.updateValues({ status: "Complete" });
      expect(container.textContent).toBe("Status: Complete");

      // Create a new container for the counter component
      const counterRef = createRef<string, HTMLElement>() as TransRef;
      const counterContainer = await render(
        <Trans key="counter" values={{ count: "42" }} ref={counterRef} />,
      );
      expect(counterContainer.textContent).toBe("Count: 42");

      // Change language
      changeLanguage("de");

      expect(container.textContent).toBe("Status: Complete");
      expect(counterContainer.textContent).toBe("Anzahl: 42");

      counterRef.updateValues({ count: "43" });
      expect(counterContainer.textContent).toBe("Anzahl: 43");
    });
  });
});
