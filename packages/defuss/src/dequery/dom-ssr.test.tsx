// @vitest-environment happy-dom
import { getBrowserGlobals, getDocument } from "../render/server.js";
import { createRef, type Globals } from "../render/index.js";
import { renderIsomorphicSync } from "../render/isomorph.js";
import { $ } from "./dequery.js";

describe("General DOM manipulation", async () => {
  let globals: Globals;
  beforeEach(() => {
    globals = getBrowserGlobals();
  });

  it("can update children of a defuss-created DOM element", async () => {
    const el = renderIsomorphicSync(
      <div>Check</div>,
      globals.document.body,
      globals,
    ) as Element;
    await $(el, { globals }).html("<div>Check2</div>");
    expect(el.childNodes[0].textContent).toEqual("Check2");
  });

  it("can update children of a DOM element with JSX", async () => {
    const el = document.createElement("div");
    el.innerHTML = "<div>Check</div>";
    await $(el, { globals }).jsx(<div>Check2</div>);
    expect(el.childNodes[0].textContent).toEqual("Check2");
  });

  it("can empty an element", async () => {
    document.body.innerHTML = "<div>Test</div>";
    await $(globals.document.body, { globals }).empty();
    expect(globals.document.body.childNodes[0]).toBeFalsy();
  });

  it("can set an attribute", async () => {
    await $(globals.document.body, { globals }).attr("foo", "bar");
    expect(globals.document.body.getAttribute("foo")).toEqual("bar");
  });

  it("can get an attribute", async () => {
    await $(globals.document.body, { globals }).attr("foo2", "bar");
    expect(await $(globals.document.body, { globals }).attr("foo2")).toEqual(
      "bar",
    );
  });

  it("can get an input value", async () => {
    const inputRef = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} value="123" />,
      document.body,
      globals,
    ) as Element;
    expect(await $(inputRef, { globals }).val()).toEqual("123");
  });

  it("can set an input value", async () => {
    const inputRef = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} value="123" />,
      document.body,
      globals,
    ) as Element;
    await $(inputRef, { globals }).val("345");
    expect(await $(inputRef, { globals }).val()).toEqual("345");
  });

  it("can get a checkbox checked value", async () => {
    const inputRef = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} type="checkbox" checked />,
      document.body,
      globals,
    ) as Element;
    expect(await $(inputRef, { globals }).val()).toEqual(true);
  });

  it("can set a checkbox checked value", async () => {
    const inputRef = createRef();
    renderIsomorphicSync(
      <input ref={inputRef} type="checkbox" />,
      document.body,
      globals,
    ) as Element;
    await $(inputRef, { globals }).val(true);
    expect(await $(inputRef, { globals }).val()).toEqual(true);
  });

  it("can replace an element with another", async () => {
    const divRef = createRef();
    renderIsomorphicSync(
      <div ref={divRef}>Check</div>,
      document.body,
      globals,
    ) as Element;

    divRef.current = await $<HTMLElement>(divRef)
      .replaceWith(<input tabIndex="-2" />)
      .getFirstElement();

    expect(await $<HTMLElement>(divRef).attr("tabIndex")).toEqual("-2");
  });

  it("remove an element", async () => {
    await $(globals.document.body).remove();
    expect(globals.document.body).toBeFalsy();
  });

  it("can register for an event programmatically", async () => {
    const elRef = createRef();
    renderIsomorphicSync(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      globals.document.body,
      globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    await $(elRef, { globals }).on("click", onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(1);
  });

  it("can *un*register for an event programmatically", async () => {
    const elRef = createRef();
    renderIsomorphicSync(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      globals.document.body,
      globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    await $(elRef, { globals }).on("click", onClick);
    await $(elRef, { globals }).off("click", onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(0);
  });

  it("can set and get a property programmatically", async () => {
    const elRef = createRef();
    renderIsomorphicSync(
      <input type="text" ref={elRef} />,
      globals.document.body,
      globals,
    ) as Element;

    await $(elRef, { globals }).prop("value", "Hello World");
    const value = await $(elRef, { globals }).prop("value");

    expect(value).toEqual("Hello World");
  });

  it("can get an attribute", async () => {
    await $(globals.document.body, { globals }).attr("foo2", "bar2");
    const val = await $(globals.document.body, { globals }).attr("foo2");
    expect(val).toEqual("bar2");
  });

  it("can set a property", async () => {
    const input = await $('<input type="text">', { globals });
    await input.prop("value", "test value");
    expect((input[0] as HTMLInputElement).value).toEqual("test value");
  });

  it("can get a property", async () => {
    const input = await $('<input type="text">', { globals });
    await input.prop("value", "test value get");
    const val = await input.prop("value");
    expect(val).toEqual("test value get");
  });

  it("can remove elements", async () => {
    renderIsomorphicSync(
      <div id="remove-me">Hello</div>,
      globals.document.body,
      globals,
    ) as Element;
    await $("#remove-me", { globals }).remove();
    expect(globals.document.body.querySelector("#remove-me")).toBeNull();
  });

  it("can replace an element with HTML string", async () => {
    renderIsomorphicSync(
      <div id="replace-me">Old</div>,
      globals.document.body,
      globals,
    ) as Element;
    await $("#replace-me", { globals }).replaceWith('<p id="replaced">New</p>');
    expect(globals.document.body.querySelector("#replace-me")).toBeNull();
    expect(globals.document.body.querySelector("#replaced")).not.toBeNull();
    expect(globals.document.body.querySelector("#replaced")?.textContent).toBe(
      "New",
    );
  });

  it("can replace an element with JSX", async () => {
    renderIsomorphicSync(
      <div id="replace-jsx">Old</div>,
      globals.document.body,
      globals,
    ) as Element;
    await $("#replace-jsx", { globals }).replaceWith(
      <span id="replaced-jsx">New JSX</span>,
    );
    expect(globals.document.body.querySelector("#replace-jsx")).toBeNull();
    expect(globals.document.body.querySelector("#replaced-jsx")).not.toBeNull();
    expect(
      globals.document.body.querySelector("#replaced-jsx")?.textContent,
    ).toBe("New JSX");
  });

  it("can replace an element with another Dequery element", async () => {
    renderIsomorphicSync(
      <div id="replace-dequery">Old</div>,
      globals.document.body,
      globals,
    ) as Element;

    const newEl = await $('<i id="replaced-dequery-el">New Dequery</i>', {
      globals,
    });
    await $("#replace-dequery", { globals }).replaceWith(newEl);

    expect(
      globals.document.body.querySelector("#replaced-dequery-el"),
    ).not.toBeNull();

    expect(
      globals.document.body.querySelector("#replaced-dequery-el")?.textContent,
    ).toBe("New Dequery");
  });

  it("can append HTML string to an element", async () => {
    renderIsomorphicSync(
      <div id="append-to-me">Start</div>,
      globals.document.body,
      globals,
    ) as Element;
    await $("#append-to-me", { globals }).append("<span> End</span>");
    expect(
      globals.document.body.querySelector("#append-to-me")?.innerHTML,
    ).toBe("Start<span> End</span>");
  });

  it("can append a Dequery element to an element", async () => {
    renderIsomorphicSync(
      <div id="append-dequery">Start</div>,
      globals.document.body,
      globals,
    ) as Element;
    const newEl = await $("<em>Middle</em>", { globals });
    await $("#append-dequery", { globals }).append(newEl);
    expect(
      globals.document.body.querySelector("#append-dequery")?.innerHTML,
    ).toBe("Start<em>Middle</em>");
  });

  it("can append an element to a target selector", async () => {
    renderIsomorphicSync(
      <>
        <div id="append-target">Target</div>
        <p id="to-append">Source</p>
      </>,
      globals.document.body,
      globals,
    ) as Element;

    await $("#to-append", { globals }).appendTo("#append-target");
    // Note: appendTo clones the element
    expect(
      globals.document.querySelector("#append-target > p")?.textContent,
    ).toBe("Source");
    expect(globals.document.body.querySelector("#to-append")).not.toBeNull(); // Original still exists
  });

  // TODO: fix all the other tests using rendering to globals.document.body!
  it("can set text content", async () => {
    renderIsomorphicSync(
      <div id="set-text">
        <span>Old</span>
      </div>,
      globals.document.body,
      globals,
    ) as Element;

    await $("#set-text", { globals }).text("New Text");

    expect(globals.document.body.querySelector("#set-text")?.textContent).toBe(
      "New Text",
    );
    expect(globals.document.body.querySelector("#set-text > span")).toBeNull(); // Child elements are removed
  });

  it("can update content with string (text)", async () => {
    renderIsomorphicSync(
      <div id="update-text">Old</div>,
      globals.document.body,
      globals,
    ) as Element;

    await $("#update-text", { globals }).update("New Text Update");
    expect(
      globals.document.body.querySelector("#update-text")?.textContent,
    ).toBe("New Text Update");
  });

  it("can update content with string (html)", async () => {
    renderIsomorphicSync(
      <div id="update-html">Old</div>,
      globals.document.body,
      globals,
    ) as Element;

    await $("#update-html", { globals }).update("<span>New HTML Update</span>");
    expect(globals.document.body.querySelector("#update-html")?.innerHTML).toBe(
      "<span>New HTML Update</span>",
    );
  });

  it("can update content with JSX", async () => {
    renderIsomorphicSync(
      <div id="update-jsx">Old</div>,
      globals.document.body,
      globals,
    ) as Element;

    await $("#update-jsx", { globals }).update(<i>New JSX Update</i>);
    expect(globals.document.body.querySelector("#update-jsx")?.innerHTML).toBe(
      "<i>New JSX Update</i>",
    );
  });

  it("can get value from input", async () => {
    renderIsomorphicSync(
      <input id="get-val" value="initial" />,
      globals.document.body,
      globals,
    ) as Element;

    const val = await $("#get-val", { globals }).val();
    expect(val).toBe("initial");
  });

  it("can set value for input", async () => {
    renderIsomorphicSync(
      <input id="set-val" value="initial" />,
      globals.document.body,
      globals,
    ) as Element;

    await $("#set-val", { globals }).val("new value");
    expect(
      (globals.document.body.querySelector("#set-val") as HTMLInputElement)
        .value,
    ).toBe("new value");
  });

  it("can get checked state from checkbox", async () => {
    renderIsomorphicSync(
      <input id="get-check" type="checkbox" checked />,
      globals.document.body,
      globals,
    ) as Element;
    const val = await $("#get-check", { globals }).val();
    expect(val).toBe(true);
  });

  it("can set checked state for checkbox", async () => {
    renderIsomorphicSync(
      <input id="set-check" type="checkbox" />,
      globals.document.body,
      globals,
    ) as Element;
    await $("#set-check", { globals }).val(true);
    expect(
      (globals.document.body.querySelector("#set-check") as HTMLInputElement)
        .checked,
    ).toBe(true);
    await $("#set-check", { globals }).val(false);
    expect(
      (globals.document.body.querySelector("#set-check") as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it("can get data attribute", async () => {
    renderIsomorphicSync(
      <div id="get-data" data-test="value1"></div>,
      globals.document.body,
      globals,
    ) as Element;
    const data = await $("#get-data", { globals }).data("test");
    expect(data).toBe("value1");
  });

  it("can set data attribute", async () => {
    renderIsomorphicSync(
      <div id="set-data"></div>,
      globals.document.body,
      globals,
    ) as Element;
    await $("#set-data", { globals }).data("test-set", "value2");
    expect(
      (globals.document.body.querySelector("#set-data") as HTMLElement).dataset
        .testSet,
    ).toBe("value2");
  });

  it("can get form data", async () => {
    renderIsomorphicSync(
      <form id="get-form">
        <input name="text" value="abc" />
        <input name="check" type="checkbox" checked />
        <select name="select">
          <option value="1">1</option>
          <option value="2" selected>
            2
          </option>
        </select>
      </form>,
      globals.document.body,
      globals,
    ) as Element;

    const formData = await $("#get-form", { globals }).form<{
      text: string;
      check: boolean;
      select: string;
    }>();

    expect(formData).toEqual({
      text: "abc",
      check: true,
      select: "2",
    });
  });

  it("can set form data", async () => {
    renderIsomorphicSync(
      <form id="set-form">
        <input name="text" value="abc" />
        <input name="check" type="checkbox" />
        <select name="select">
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </form>,
      globals.document.body,
      globals,
    ) as Element;

    await $("#set-form", { globals }).form({
      text: "xyz",
      check: true,
      select: "1",
    });

    expect(
      (
        globals.document.body.querySelector(
          '#set-form input[name="text"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("xyz");
    expect(
      (
        globals.document.body.querySelector(
          '#set-form input[name="check"]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      (
        globals.document.body.querySelector(
          '#set-form select[name="select"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe("1");
  });

  it("can map over elements", async () => {
    renderIsomorphicSync(
      <>
        <div class="map-item">1</div>
        <div class="map-item">2</div>
      </>,
      globals.document.body,
      globals,
    ) as Element;

    const texts = await $<HTMLElement>(".map-item", { globals }).map(
      (el) => el.textContent,
    );
    expect(texts).toEqual(["1", "2"]);
  });

  it("can convert selection to array", async () => {
    renderIsomorphicSync(
      <>
        <div class="to-array-item">A</div>
        <div class="to-array-item">B</div>
      </>,
      globals.document.body,
      globals,
    ) as Element;

    const elements = await $<HTMLElement>(".to-array-item", {
      globals,
    }).toArray();
    expect(Array.isArray(elements)).toBe(true);
    expect(elements.length).toBe(2);
    expect(elements[0].textContent).toBe("A");
  });
});

describe("Event Handling", () => {
  let eventFired: boolean;
  let handler1: EventListener;
  let handler2: EventListener;
  let globals: Globals;

  beforeEach(() => {
    globals = getBrowserGlobals();
    globals.document = getDocument(true, globals);

    renderIsomorphicSync(
      <body>
        <button id="event-btn" type="button">
          Click Me
        </button>
      </body>,
      globals.document.body,
      globals,
    ) as Element;
    eventFired = false;
    handler1 = () => {
      eventFired = true;
      console.log("Handler 1 fired");
    };
    handler2 = () => {
      console.log("Handler 2 fired");
    }; // Another handler
  });

  it("can add and trigger an event listener", async () => {
    await $("#event-btn", { globals }).on("click", handler1);
    await $("#event-btn", { globals }).trigger("click");
    expect(eventFired).toBe(true);
  });

  it("can remove a specific event listener", async () => {
    await $("#event-btn", { globals }).on("click", handler1);
    await $("#event-btn", { globals }).on("click", handler2); // Add a second handler
    await $("#event-btn", { globals }).off("click", handler1); // Remove only handler1
    await $("#event-btn", { globals }).trigger("click");
    expect(eventFired).toBe(false); // handler1 should not have fired
    // We can't easily test if handler2 fired without more complex spies,
    // but we know handler1 was removed.
  });

  it("can remove all listeners for an event type", async () => {
    await $("#event-btn", { globals }).on("click", handler1);
    await $("#event-btn", { globals }).on("click", handler2);
    await $("#event-btn", { globals }).off("click"); // Remove all click listeners
    await $("#event-btn", { globals }).trigger("click");
    expect(eventFired).toBe(false);
  });

  it("can clear all tracked event listeners from an element", async () => {
    await $("#event-btn", { globals }).on("click", handler1);
    await $("#event-btn", { globals }).on("mouseover", handler2); // Add a different event type
    await $("#event-btn", { globals }).clearEvents();
    await $("#event-btn", { globals }).trigger("click");
    await $("#event-btn", { globals }).trigger("mouseover");
    expect(eventFired).toBe(false);
    // Again, hard to verify handler2 didn't fire without spies, but both should be gone.
  });
});
