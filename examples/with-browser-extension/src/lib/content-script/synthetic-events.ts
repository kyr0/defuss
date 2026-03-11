/**
 * Synthetic event helpers that simulate natural user interactions
 * (typing, clicking) for browser automation.
 */
import config from "../../../config";

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// pressSequentially — type one character at a time with realistic events
// ---------------------------------------------------------------------------

export interface PressSequentiallyOptions {
  /** Per-keystroke delay in ms (default: 50) */
  delayMs?: number;
}

/**
 * Get the native value setter for an input/textarea element.
 * This bypasses framework-patched setters (Angular, React, etc.)
 * so the browser fires its internal change-tracking logic.
 */
function getNativeValueSetter(
  el: HTMLInputElement | HTMLTextAreaElement,
): ((v: string) => void) | undefined {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  return descriptor?.set;
}

/**
 * Type `text` into an input/textarea character by character,
 * dispatching keydown → input → keyup for every character.
 *
 * Uses the native value setter + `InputEvent` so that frameworks
 * relying on zone.js or synthetic-event interception (Angular, React)
 * pick up the changes.
 */
export async function pressSequentially(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  options: PressSequentiallyOptions = {},
): Promise<void> {
  const delay = config.syntheticEvents.keystrokeDelayMs ?? options.delayMs;
  const nativeSetter = getNativeValueSetter(el);

  el.focus();

  // Clear the field via the native setter so frameworks detect the reset
  if (nativeSetter) {
    nativeSetter.call(el, "");
  } else {
    el.value = "";
  }
  el.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "deleteContentBackward",
    }),
  );

  for (const char of text) {
    const keyOptions: KeyboardEventInit = {
      key: char,
      code: `Key${char.toUpperCase()}`,
      charCode: char.charCodeAt(0),
      keyCode: char.charCodeAt(0),
      bubbles: true,
    };

    el.dispatchEvent(new KeyboardEvent("keydown", keyOptions));
    await sleep(delay);

    // Update value via native setter to bypass framework wrappers
    const newValue = el.value + char;
    if (nativeSetter) {
      nativeSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }

    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: char,
        inputType: "insertText",
      }),
    );

    el.dispatchEvent(new KeyboardEvent("keyup", keyOptions));
    await sleep(delay);
  }

  // Final change event (simulates blur / value commit)
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ---------------------------------------------------------------------------
// fill — high-level "type this value" (calls pressSequentially internally)
// ---------------------------------------------------------------------------

export interface FillOptions extends PressSequentiallyOptions {}

/**
 * Fill an input/textarea with `text`, simulating character-by-character typing
 * and then setting the final `.value` for frameworks that read it on change.
 */
export async function fill(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  options: FillOptions = {},
): Promise<void> {
  await pressSequentially(el, text, options);

  // Ensure the final value matches exactly (covers framework quirks)
  el.value = text;
  await sleep(options.delayMs ?? config.syntheticEvents.keystrokeDelayMs);
}

// ---------------------------------------------------------------------------
// click — simulate a realistic mouse click sequence
// ---------------------------------------------------------------------------

/**
 * Simulate a natural click on `el`: mousedown → click → mouseup → focus.
 */
export async function click(
  el: HTMLElement,
  delayMs = config.syntheticEvents.clickDelayMs,
): Promise<void> {
  el.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );

  el.click();
  await sleep(delayMs);

  el.dispatchEvent(
    new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );

  el.focus();
}

// ---------------------------------------------------------------------------
// press — simulate pressing a single key (with optional modifiers)
// ---------------------------------------------------------------------------

export interface PressOptions {
  delayMs?: number;
}

/**
 * Press a key (e.g. `"Enter"`, `"Ctrl+A"`, `"Tab"`).
 * Dispatches keydown → keypress → keyup. For `Enter`, also triggers
 * synthetic default behaviour (link click / form submit).
 */
export async function press(
  el: HTMLElement,
  key: string,
  options: PressOptions = {},
): Promise<void> {
  const delay = config.syntheticEvents.keystrokeDelayMs ?? options.delayMs;
  el.focus();

  let shiftKey = false;
  let ctrlKey = false;
  let altKey = false;
  let metaKey = false;

  const parts = key.split("+");
  const keyPart = parts.pop()!;

  for (const modifier of parts) {
    switch (modifier) {
      case "Shift":
        shiftKey = true;
        break;
      case "Ctrl":
        ctrlKey = true;
        break;
      case "Alt":
        altKey = true;
        break;
      case "Meta":
        metaKey = true;
        break;
    }
  }

  const { keyCode, codeValue } = resolveKeyCode(keyPart);

  const init: KeyboardEventInit = {
    key: keyPart,
    code: codeValue,
    keyCode,
    charCode: keyCode,
    shiftKey,
    ctrlKey,
    altKey,
    metaKey,
    bubbles: true,
    cancelable: true,
  };

  const downAllowed = el.dispatchEvent(new KeyboardEvent("keydown", init));
  await sleep(delay);

  if (downAllowed) {
    el.dispatchEvent(new KeyboardEvent("keypress", init));
    await sleep(delay);
    el.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  if (keyPart === "Enter") {
    pressEnter(el);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function pressEnter(el: HTMLElement): void {
  // Link or button — simulate click
  if (
    (el.tagName === "A" && (el as HTMLAnchorElement).href) ||
    el.tagName === "BUTTON"
  ) {
    el.click();
  }

  // Form element — submit the form
  if (
    el.tagName === "FORM" ||
    (el.closest("form") && (el.tagName === "BUTTON" || el.tagName === "INPUT"))
  ) {
    el.closest("form")?.submit();
  }
}

/** Map a key name to its keyCode and code values */
function resolveKeyCode(keyPart: string): {
  keyCode: number;
  codeValue: string;
} {
  const specialKeys: Record<string, [number, string]> = {
    Enter: [13, "Enter"],
    Tab: [9, "Tab"],
    ArrowDown: [40, "ArrowDown"],
    ArrowUp: [38, "ArrowUp"],
    ArrowLeft: [37, "ArrowLeft"],
    ArrowRight: [39, "ArrowRight"],
    Backspace: [8, "Backspace"],
    Delete: [46, "Delete"],
    Escape: [27, "Escape"],
    Space: [32, "Space"],
    PageUp: [33, "PageUp"],
    PageDown: [34, "PageDown"],
    End: [35, "End"],
    Home: [36, "Home"],
    Insert: [45, "Insert"],
    CapsLock: [20, "CapsLock"],
  };

  // Check special keys
  if (specialKeys[keyPart]) {
    const [keyCode, codeValue] = specialKeys[keyPart];
    return { keyCode, codeValue };
  }

  // Function keys (F1–F12)
  const fnMatch = keyPart.match(/^F(\d{1,2})$/);
  if (fnMatch) {
    const num = Number.parseInt(fnMatch[1], 10);
    return { keyCode: 111 + num, codeValue: keyPart };
  }

  // Single character (letter / digit)
  if (keyPart.length === 1) {
    return {
      keyCode: keyPart.toUpperCase().charCodeAt(0),
      codeValue: `Key${keyPart.toUpperCase()}`,
    };
  }

  // Fallback
  return { keyCode: 0, codeValue: keyPart };
}
