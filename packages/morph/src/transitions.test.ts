import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TRANSITION_CONFIG,
  applyStyles,
  getTransitionStyles,
  morph,
  performTransition,
} from "./index.js";

const container = (html = ""): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
};

// tests append containers to document.body; keep it pristine between tests so
// crossfade snapshot accounting (body child counts) stays deterministic
beforeEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("#defuss-shake").forEach((n) => n.remove());
});

describe("getTransitionStyles", () => {
  it("returns enter/exit phases for all predefined types", () => {
    for (const type of ["fade", "slide-left", "slide-right", "shake"] as const) {
      const styles = getTransitionStyles(type, 100);
      expect(styles.enter).toBeDefined();
      expect(styles.enterActive).toBeDefined();
      expect(styles.exit).toBeDefined();
      expect(styles.exitActive).toBeDefined();
    }
  });

  it("returns empty styles for unknown types", () => {
    const styles = getTransitionStyles("nope" as any, 100);
    expect(styles).toEqual({
      enter: {},
      enterActive: {},
      exit: {},
      exitActive: {},
    });
  });

  it("injects the shake keyframes once (idempotent)", () => {
    getTransitionStyles("shake", 100);
    getTransitionStyles("shake", 100);
    const keyframes = document.head.querySelectorAll("#defuss-shake");
    expect(keyframes.length).toBe(1);
  });

  it("encodes duration and easing into the transition shorthand", () => {
    const styles = getTransitionStyles("fade", 150, "ease-out");
    expect(styles.exit.transition).toContain("150ms");
    expect(styles.exit.transition).toContain("ease-out");
  });
});

describe("applyStyles", () => {
  it("applies style properties via setProperty", () => {
    const el = container();
    applyStyles(el, { opacity: "0.5", transform: "scale(2)" });
    expect(el.style.getPropertyValue("opacity")).toBe("0.5");
    expect(el.style.getPropertyValue("transform")).toBe("scale(2)");
  });
});

describe("performTransition", () => {
  it("type 'none' runs the callback without touching styles", async () => {
    const el = container();
    const cb = vi.fn();
    await performTransition(el, cb, { type: "none" });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(el.style.cssText).toBe("");
  });

  it("applies exit/enter styles around the update and restores afterwards", async () => {
    const el = container(`<p>before</p>`);
    const phases: string[] = [];

    await performTransition(
      el,
      async () => {
        phases.push("update");
        el.innerHTML = "<p>after</p>";
      },
      { type: "slide-left", duration: 5 },
    );

    expect(phases).toEqual(["update"]);
    expect(el.textContent).toBe("after");
    // original styles restored
    expect(el.style.transition).toBe("");
    expect(el.style.animation).toBe("");
  });

  it("supports custom transition styles", async () => {
    const el = container();
    await performTransition(el, async () => {}, {
      type: "fade", // type ignored when custom styles given (non-crossfade path needs non-fade)
      styles: {
        enter: { opacity: "0" },
        enterActive: { opacity: "1" },
        exit: { opacity: "1" },
        exitActive: { opacity: "0" },
      },
      duration: 1,
    });
    expect(el.style.transition).toBe("");
  });

  it("crossfade (fade): morphs content and restores the element style", async () => {
    const el = container(`<p>before</p>`);
    await performTransition(
      el,
      async () => {
        el.innerHTML = "<p>after</p>";
      },
      { type: "fade", duration: 5 },
    );
    expect(el.textContent).toBe("after");
    expect(el.style.cssText).toBe("");
    // snapshot cleaned up: body contains only the test container
    expect(document.body.children.length).toBe(1);
  });

  it("restores styles and rethrows when the update callback fails", async () => {
    const el = container();
    el.style.transition = "color 1s";

    await expect(
      performTransition(
        el,
        async () => {
          throw new Error("boom");
        },
        { type: "slide-right", duration: 1 },
      ),
    ).rejects.toThrow("boom");

    expect(el.style.transition).toBe("color 1s");
  });

  it("cleans up the crossfade snapshot when the update fails", async () => {
    const el = container();
    await expect(
      performTransition(
        el,
        async () => {
          throw new Error("boom");
        },
        { type: "fade", duration: 1 },
      ),
    ).rejects.toThrow("boom");
    expect(el.style.cssText).toBe("");
    expect(document.body.children.length).toBe(1);
  });

  it("honors delay before starting", async () => {
    const el = container();
    const started = Date.now();
    // note: type "none" bypasses the transition machinery entirely (incl. delay),
    // so use a real transition type here
    await performTransition(el, async () => {}, { type: "slide-left", duration: 1, delay: 20 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(15);
  });

  it("restarts shake animation cleanly", async () => {
    const el = container();
    el.style.animation = "spin 1s";
    const original = el.style.animation; // browsers normalize the shorthand
    await performTransition(el, async () => {}, { type: "shake", duration: 5 });
    expect(el.style.animation).toBe(original);
  });
});

describe("DEFAULT_TRANSITION_CONFIG", () => {
  it("matches the documented defaults", () => {
    expect(DEFAULT_TRANSITION_CONFIG).toEqual({
      type: "fade",
      duration: 300,
      easing: "ease-in-out",
      delay: 0,
      target: "parent",
    });
  });
});

describe("morph() with transitions", () => {
  it("returns a Promise and morphs when a transition is given (self target)", async () => {
    const el = container(`<p>before</p>`);
    const result = morph(el, `<p>after</p>`, {
      transition: { type: "fade", duration: 5, target: "self" },
    });
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(el.textContent).toBe("after");
  });

  it("returns a Promise and morphs with the default parent target", async () => {
    const el = container(`<p>before</p>`);
    await morph(el, `<p>after</p>`, { transition: { type: "slide-left", duration: 5 } });
    expect(el.textContent).toBe("after");
  });

  it("type 'none' stays synchronous", () => {
    const el = container(`<p>a</p>`);
    const result = morph(el, `<p>b</p>`, { transition: { type: "none" } });
    expect(result).toBeUndefined();
    expect(el.textContent).toBe("b");
  });

  it("morphs directly when the element is detached (no transition parent)", () => {
    const el = document.createElement("div"); // no parentElement
    const result = morph(el, `<p>x</p>`, {
      transition: { type: "slide-left", duration: 5 }, // default target: "parent"
    });
    expect(result).toBeUndefined();
    expect(el.innerHTML).toBe("<p>x</p>");
  });

  it("is latest-wins when a plain morph overlaps a transition's exit phase", async () => {
    const el = container(`<p>A</p>`);
    const pending = morph(el, `<p>B-stale</p>`, {
      transition: { type: "slide-left", duration: 30, target: "self" },
    });
    morph(el, `<p>C-latest</p>`); // during the exit phase

    await pending;
    expect(el.textContent).toBe("C-latest");
  });
});
