// @vitest-environment happy-dom
import { createRef, type Globals, type Ref } from "../render/index.js";
import { renderIsomorphicSync } from "../render/isomorph.js";
import { $ } from "./dequery.js";

describe("General DOM manipulation", async () => {
  it("can update children of a defuss-created DOM element", async () => {
    const el = renderIsomorphicSync(
      <div>Check</div>,
      undefined,
      globalThis as Globals,
    ) as Element;
    await $(el).html(<div>Check2</div>);
    expect(el.childNodes[0].textContent).toEqual("Check2");
  });

  it("can empty an element", async () => {
    document.body.innerHTML = "<div>Test</div>";
    await $(document.body).empty();
    expect(document.body.childNodes[0]).toBeFalsy();
  });

  it("can set an attribute", async () => {
    await $(document.body).attr("foo", "bar");
    expect(document.body.getAttribute("foo")).toEqual("bar");
  });

  it("can get an attribute", async () => {
    await $(document.body).attr("foo2", "bar");
    expect($(document.body).attr("foo2")).toEqual("bar");
  });

  it("can get an input value", async () => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} value="123" />,
      document.body,
      globalThis as Globals,
    ) as Element;
    expect(await $(inputRef.current!).val()).toEqual("123");
  });

  it("can set an input value", async () => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} value="123" />,
      document.body,
      globalThis as Globals,
    ) as Element;
    await $(inputRef.current!).val("345");
    expect(await $(inputRef.current!).val()).toEqual("345");
  });

  it("can get a checkbox checked value", async () => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} type="checkbox" checked />,
      document.body,
      globalThis as Globals,
    ) as Element;
    expect(await $(inputRef.current!).val()).toEqual(true);
  });

  it("can set a checkbox checked value", async () => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} type="checkbox" />,
      document.body,
      globalThis as Globals,
    ) as Element;
    await $(inputRef.current!).val(true);
    expect(await $(inputRef.current!).val()).toEqual(true);
  });

  it("can replace an element with another", async () => {
    const divRef: any = {};
    renderIsomorphicSync(
      <div ref={divRef}>Check</div>,
      document.body,
      globalThis as Globals,
    ) as Element;
    divRef.current = await $(divRef.current).replaceWith(
      <input tabIndex="-2" />,
    );
    expect(await $(divRef.current).attr("tabIndex")).toEqual("-2");
  });

  it("remove an element", async () => {
    await $(document.body).remove();
    expect(document.body).toBeFalsy();
  });

  it("can register for an event programmatically", async () => {
    const elRef: any = {};
    renderIsomorphicSync(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      undefined,
      globalThis as Globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    await $(elRef.current).on("click", onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(1);
  });

  it("can *un*register for an event programmatically", async () => {
    const elRef: any = {};
    renderIsomorphicSync(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      undefined,
      globalThis as Globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    await $(elRef.current).on("click", onClick);
    await $(elRef.current).off("click", onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(0);
  });

  it("can set and get a property programmatically", async () => {
    const elRef: any = {};
    renderIsomorphicSync(
      <input type="text" ref={elRef} />,
      undefined,
      globalThis as Globals,
    ) as Element;

    await $(elRef.current).prop("value", "Hello World");
    const value = await $(elRef.current).prop("value");

    expect(value).toEqual("Hello World");
  });

  it("can get an attribute", async () => {
    await $(document.body).attr("foo2", "bar2");
    const val = await $(document.body).attr("foo2");
    expect(val).toEqual("bar2");
  });

  it("can set a property", async () => {
    const input = await $('<input type="text">');
    await input.prop("value", "test value");
    expect((input[0] as HTMLInputElement).value).toEqual("test value");
  });

  it("can get a property", async () => {
    const input = await $('<input type="text">');
    await input.prop("value", "test value get");
    const val = await input.prop("value");
    expect(val).toEqual("test value get");
  });

  it("can remove elements", async () => {
    document.body.innerHTML = '<div id="remove-me">Hello</div>';
    await $("#remove-me").remove();
    expect(document.getElementById("remove-me")).toBeNull();
  });

  it("can replace an element with HTML string", async () => {
    document.body.innerHTML = '<div id="replace-me">Old</div>';
    await $("#replace-me").replaceWith('<p id="replaced">New</p>');
    expect(document.getElementById("replace-me")).toBeNull();
    expect(document.getElementById("replaced")).not.toBeNull();
    expect(document.getElementById("replaced")?.textContent).toBe("New");
  });

  it("can replace an element with JSX", async () => {
    document.body.innerHTML = '<div id="replace-jsx">Old</div>';
    await $("#replace-jsx").replaceWith(<span id="replaced-jsx">New JSX</span>);
    expect(document.getElementById("replace-jsx")).toBeNull();
    expect(document.getElementById("replaced-jsx")).not.toBeNull();
    expect(document.getElementById("replaced-jsx")?.textContent).toBe(
      "New JSX",
    );
  });

  it("can replace an element with another Dequery element", async () => {
    document.body.innerHTML = '<div id="replace-dequery">Old</div>';
    const newEl = await $('<i id="replaced-dequery-el">New Dequery</i>');
    await $("#replace-dequery").replaceWith(newEl);
    expect(document.getElementById("replace-dequery")).toBeNull();
    expect(document.getElementById("replaced-dequery-el")).not.toBeNull();
    expect(document.getElementById("replaced-dequery-el")?.textContent).toBe(
      "New Dequery",
    );
  });

  it("can append HTML string to an element", async () => {
    document.body.innerHTML = '<div id="append-to-me">Start</div>';
    await $("#append-to-me").append("<span> End</span>");
    expect(document.getElementById("append-to-me")?.innerHTML).toBe(
      "Start<span> End</span>",
    );
  });

  it("can append a Dequery element to an element", async () => {
    document.body.innerHTML = '<div id="append-dequery">Start</div>';
    const newEl = await $("<em>Middle</em>");
    await $("#append-dequery").append(newEl);
    expect(document.getElementById("append-dequery")?.innerHTML).toBe(
      "Start<em>Middle</em>",
    );
  });

  it("can append an element to a target selector", async () => {
    document.body.innerHTML =
      '<div id="append-target">Target</div><p id="to-append">Source</p>';
    await $("#to-append").appendTo("#append-target");
    // Note: appendTo clones the element
    expect(document.querySelector("#append-target > p")?.textContent).toBe(
      "Source",
    );
    expect(document.getElementById("to-append")).not.toBeNull(); // Original still exists
  });

  it("can set text content", async () => {
    document.body.innerHTML = '<div id="set-text"><span>Old</span></div>';
    await $("#set-text").text("New Text");
    expect(document.getElementById("set-text")?.textContent).toBe("New Text");
    expect(document.querySelector("#set-text > span")).toBeNull(); // Child elements are removed
  });

  it("can update content with string (text)", async () => {
    document.body.innerHTML = '<div id="update-text">Old</div>';
    await $("#update-text").update("New Text Update");
    expect(document.getElementById("update-text")?.textContent).toBe(
      "New Text Update",
    );
  });

  it("can update content with string (html)", async () => {
    document.body.innerHTML = '<div id="update-html">Old</div>';
    await $("#update-html").update("<span>New HTML Update</span>");
    expect(document.getElementById("update-html")?.innerHTML).toBe(
      "<span>New HTML Update</span>",
    );
  });

  it("can update content with JSX", async () => {
    document.body.innerHTML = '<div id="update-jsx">Old</div>';
    await $("#update-jsx").update(<i>New JSX Update</i>);
    expect(document.getElementById("update-jsx")?.innerHTML).toBe(
      "<i>New JSX Update</i>",
    );
  });

  it("can get value from input", async () => {
    document.body.innerHTML = '<input id="get-val" value="initial">';
    const val = await $("#get-val").val();
    expect(val).toBe("initial");
  });

  it("can set value for input", async () => {
    document.body.innerHTML = '<input id="set-val" value="initial">';
    await $("#set-val").val("new value");
    expect((document.getElementById("set-val") as HTMLInputElement).value).toBe(
      "new value",
    );
  });

  it("can get checked state from checkbox", async () => {
    document.body.innerHTML = '<input id="get-check" type="checkbox" checked>';
    const val = await $("#get-check").val();
    expect(val).toBe(true);
  });

  it("can set checked state for checkbox", async () => {
    document.body.innerHTML = '<input id="set-check" type="checkbox">';
    await $("#set-check").val(true);
    expect(
      (document.getElementById("set-check") as HTMLInputElement).checked,
    ).toBe(true);
    await $("#set-check").val(false);
    expect(
      (document.getElementById("set-check") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("can get data attribute", async () => {
    document.body.innerHTML = '<div id="get-data" data-test="value1"></div>';
    const data = await $("#get-data").data("test");
    expect(data).toBe("value1");
  });

  it("can set data attribute", async () => {
    document.body.innerHTML = '<div id="set-data"></div>';
    await $("#set-data").data("test-set", "value2");
    expect(
      (document.getElementById("set-data") as HTMLElement).dataset.testSet,
    ).toBe("value2");
  });

  it("can get form data", async () => {
    document.body.innerHTML = `
      <form id="get-form">
        <input name="text" value="abc">
        <input name="check" type="checkbox" checked>
        <select name="select">
          <option value="1">1</option>
          <option value="2" selected>2</option>
        </select>
      </form>
    `;
    const formData = await $("#get-form").form();
    expect(formData).toEqual({
      text: "abc",
      check: true,
      select: "2",
    });
  });

  it("can set form data", async () => {
    document.body.innerHTML = `
      <form id="set-form">
        <input name="text" value="abc">
        <input name="check" type="checkbox">
        <select name="select">
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </form>
    `;
    await $("#set-form").form({
      text: "xyz",
      check: true,
      select: "1",
    });
    expect(
      (
        document.querySelector(
          '#set-form input[name="text"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("xyz");
    expect(
      (
        document.querySelector(
          '#set-form input[name="check"]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      (
        document.querySelector(
          '#set-form select[name="select"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe("1");
  });

  it("can map over elements", async () => {
    document.body.innerHTML = `
      <div class="map-item">1</div>
      <div class="map-item">2</div>
    `;
    const texts = await $<HTMLElement>(".map-item").map((el) => el.textContent);
    expect(texts).toEqual(["1", "2"]);
  });

  it("can convert selection to array", async () => {
    document.body.innerHTML = `
      <div class="to-array-item">A</div>
      <div class="to-array-item">B</div>
    `;
    const elements = await $<HTMLElement>(".to-array-item").toArray();
    expect(Array.isArray(elements)).toBe(true);
    expect(elements.length).toBe(2);
    expect(elements[0].textContent).toBe("A");
  });
});

describe("Event Handling", () => {
  let eventFired: boolean;
  let handler1: EventListener;
  let handler2: EventListener;

  beforeEach(() => {
    document.body.innerHTML = '<button id="event-btn">Click Me</button>';
    eventFired = false;
    handler1 = () => {
      eventFired = true;
      console.log("Handler 1 fired");
    };
    handler2 = () => {
      console.log("Handler 2 fired");
    }; // Another handler
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("can add and trigger an event listener", async () => {
    await $("#event-btn").on("click", handler1);
    await $("#event-btn").trigger("click");
    expect(eventFired).toBe(true);
  });

  it("can remove a specific event listener", async () => {
    await $("#event-btn").on("click", handler1);
    await $("#event-btn").on("click", handler2); // Add a second handler
    await $("#event-btn").off("click", handler1); // Remove only handler1
    await $("#event-btn").trigger("click");
    expect(eventFired).toBe(false); // handler1 should not have fired
    // We can't easily test if handler2 fired without more complex spies,
    // but we know handler1 was removed.
  });

  it("can remove all listeners for an event type", async () => {
    await $("#event-btn").on("click", handler1);
    await $("#event-btn").on("click", handler2);
    await $("#event-btn").off("click"); // Remove all click listeners
    await $("#event-btn").trigger("click");
    expect(eventFired).toBe(false);
  });

  it("can clear all tracked event listeners from an element", async () => {
    await $("#event-btn").on("click", handler1);
    await $("#event-btn").on("mouseover", handler2); // Add a different event type
    await $("#event-btn").clearEvents();
    await $("#event-btn").trigger("click");
    await $("#event-btn").trigger("mouseover");
    expect(eventFired).toBe(false);
    // Again, hard to verify handler2 didn't fire without spies, but both should be gone.
  });
});

describe("Position, Dimension, Visibility", () => {
  beforeEach(() => {
    // Reset styles and content
    document.body.innerHTML = `
      <style>
        body { margin: 0; padding: 0; }
        #pos-el {
          position: absolute;
          top: 50px;
          left: 100px;
          width: 200px;
          height: 150px;
          padding: 10px;
          border: 5px solid black;
          margin: 20px;
          background: yellow; /* Make it visible */
        }
        #hidden-el { display: none; }
        #invisible-el { visibility: hidden; }
        #zero-size-el { width: 0; height: 0; overflow: hidden; }
      </style>
      <div id="pos-el">Position Test</div>
      <div id="hidden-el">Hidden</div>
      <div id="invisible-el">Invisible</div>
      <div id="zero-size-el">Zero Size</div>
    `;
    // Mock scroll position
    window.scrollTo(0, 0);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  // Note: offsetTop/offsetLeft can be tricky in jsdom.
  // getBoundingClientRect is generally more reliable for testing.
  // it('gets position relative to offsetParent', async () => {
  //   const pos = await $('#pos-el').position();
  //   // jsdom might return 0,0 depending on setup. Real browser needed for accuracy.
  //   expect(pos.top).toBeGreaterThanOrEqual(0);
  //   expect(pos.left).toBeGreaterThanOrEqual(0);
  // });

  it("gets offset relative to the document", async () => {
    // Mock getBoundingClientRect as jsdom might not calculate layout perfectly
    const el = document.getElementById("pos-el")!;
    el.getBoundingClientRect = () => ({
      top: 50, // Matches CSS top
      left: 100, // Matches CSS left
      width: 200 + 10 * 2 + 5 * 2, // width + padding*2 + border*2
      height: 150 + 10 * 2 + 5 * 2, // height + padding*2 + border*2
      bottom: 50 + 150 + 10 * 2 + 5 * 2,
      right: 100 + 200 + 10 * 2 + 5 * 2,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
    // Mock scroll position
    window.scrollX = 10;
    window.scrollY = 20;

    const offset = await $("#pos-el").offset();
    expect(offset.top).toBe(50 + 20); // rect.top + scrollY
    expect(offset.left).toBe(100 + 10); // rect.left + scrollX
  });

  it("gets dimensions (default: content + padding + border)", async () => {
    // Mock getBoundingClientRect
    const el = document.getElementById("pos-el")!;
    el.getBoundingClientRect = () =>
      ({
        width: 230, // 200 (w) + 2*10 (pad) + 2*5 (border)
        height: 180, // 150 (h) + 2*10 (pad) + 2*5 (border)
        // ... other properties
      }) as DOMRect;

    const dim = await $("#pos-el").dimension();
    expect(dim.width).toBe(230);
    expect(dim.height).toBe(180);
  });

  it("gets dimensions (content only)", async () => {
    // Mock getBoundingClientRect and computed style
    const el = document.getElementById("pos-el")!;
    el.getBoundingClientRect = () => ({ width: 230, height: 180 }) as DOMRect;
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (elt) => ({
      ...originalGetComputedStyle(elt),
      paddingLeft: "10px",
      paddingRight: "10px",
      paddingTop: "10px",
      paddingBottom: "10px",
      borderLeftWidth: "5px",
      borderRightWidth: "5px",
      borderTopWidth: "5px",
      borderBottomWidth: "5px",
    });

    const dim = await $("#pos-el").dimension(false); // includePadding = false
    expect(dim.width).toBe(200); // 230 - 2*10 (padding) - 2*5 (border)
    expect(dim.height).toBe(150); // 180 - 2*10 (padding) - 2*5 (border)

    window.getComputedStyle = originalGetComputedStyle; // Restore
  });

  it("gets dimensions (outer: content + padding + border + margin)", async () => {
    // Mock getBoundingClientRect and computed style
    const el = document.getElementById("pos-el")!;
    el.getBoundingClientRect = () => ({ width: 230, height: 180 }) as DOMRect;
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (elt) => ({
      ...originalGetComputedStyle(elt),
      marginLeft: "20px",
      marginRight: "20px",
      marginTop: "20px",
      marginBottom: "20px",
      // Need padding/border for base calculation if includePadding=true (default for outer)
      paddingLeft: "10px",
      paddingRight: "10px",
      paddingTop: "10px",
      paddingBottom: "10px",
      borderLeftWidth: "5px",
      borderRightWidth: "5px",
      borderTopWidth: "5px",
      borderBottomWidth: "5px",
    });

    // dimension(includeMargin = true, includePadding = true [default])
    const dim = await $("#pos-el").dimension(true, true);
    expect(dim.width).toBe(230); // Base width (includes padding/border)
    expect(dim.height).toBe(180); // Base height (includes padding/border)
    expect(dim.outerWidth).toBe(270); // 230 + 2*20 (margin)
    expect(dim.outerHeight).toBe(220); // 180 + 2*20 (margin)

    window.getComputedStyle = originalGetComputedStyle; // Restore
  });

  it("gets dimensions (outer without padding/border: content + margin)", async () => {
    // Mock getBoundingClientRect and computed style
    const el = document.getElementById("pos-el")!;
    el.getBoundingClientRect = () => ({ width: 230, height: 180 }) as DOMRect;
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (elt) => ({
      ...originalGetComputedStyle(elt),
      marginLeft: "20px",
      marginRight: "20px",
      marginTop: "20px",
      marginBottom: "20px",
      paddingLeft: "10px",
      paddingRight: "10px",
      paddingTop: "10px",
      paddingBottom: "10px",
      borderLeftWidth: "5px",
      borderRightWidth: "5px",
      borderTopWidth: "5px",
      borderBottomWidth: "5px",
    });

    // dimension(includeMargin = true, includePadding = false)
    const dim = await $("#pos-el").dimension(true, false);
    expect(dim.width).toBe(200); // Base width (content only)
    expect(dim.height).toBe(150); // Base height (content only)
    // Outer calculation uses the base width/height calculated *without* padding/border
    expect(dim.outerWidth).toBe(240); // 200 + 2*20 (margin)
    expect(dim.outerHeight).toBe(190); // 150 + 2*20 (margin)

    window.getComputedStyle = originalGetComputedStyle; // Restore
  });

  it("checks visibility: element is visible", async () => {
    // Mock necessary properties for visibility check in jsdom
    const el = document.getElementById("pos-el")!;
    Object.defineProperty(el, "offsetWidth", { value: 230 });
    Object.defineProperty(el, "offsetHeight", { value: 180 });
    document.body.contains = () => true; // Mock contains

    const visible = await $("#pos-el").isVisible();
    expect(visible).toBe(true);
  });

  it("checks visibility: element is hidden (display: none)", async () => {
    const hidden = await $("#hidden-el").isVisible();
    expect(hidden).toBe(false);
    const isHidden = await $("#hidden-el").isHidden();
    expect(isHidden).toBe(true);
  });

  it("checks visibility: element is invisible (visibility: hidden)", async () => {
    // Mock necessary properties for visibility check in jsdom
    const el = document.getElementById("invisible-el")!;
    Object.defineProperty(el, "offsetWidth", { value: 100 }); // Give it some size
    Object.defineProperty(el, "offsetHeight", { value: 50 });
    document.body.contains = () => true; // Mock contains

    const visible = await $("#invisible-el").isVisible();
    expect(visible).toBe(false);
    const isHidden = await $("#invisible-el").isHidden();
    expect(isHidden).toBe(true);
  });

  it("checks visibility: element has zero size", async () => {
    // offsetWidth/Height will be 0 naturally for #zero-size-el
    const visible = await $("#zero-size-el").isVisible();
    expect(visible).toBe(false);
    const isHidden = await $("#zero-size-el").isHidden();
    expect(isHidden).toBe(true);
  });

  // scrollIntoView, scrollTo, scrollBy are hard to test meaningfully in jsdom
  // as they don't perform actual scrolling or layout updates.
  // We can just test that the methods exist and don't throw errors.
  it("calls scrollIntoView without error", async () => {
    await expect($("#pos-el").scrollIntoView()).resolves.toBeNull();
  });

  it("calls scrollTo without error", async () => {
    await expect($("#pos-el").scrollTo(10, 20)).resolves.toBeNull();
    await expect(
      $("#pos-el").scrollTo({ top: 30, left: 40, behavior: "smooth" }),
    ).resolves.toBeNull();
  });

  it("calls scrollBy without error", async () => {
    await expect($("#pos-el").scrollBy(5, 15)).resolves.toBeNull();
    await expect(
      $("#pos-el").scrollBy({ top: -10, left: -5, behavior: "auto" }),
    ).resolves.toBeNull();
  });
});
