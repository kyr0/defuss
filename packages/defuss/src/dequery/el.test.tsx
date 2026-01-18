// @vitest-environment happy-dom
import { $, CallChainImpl } from "./dequery.js";

describe("Element creation test", async () => {
  it("can create a <div> element with class and id", async () => {
    const d = await $<HTMLElement>("<div>", { class: "boxed task", id: "foo" });
    expect(d).toBeInstanceOf(CallChainImpl); // check that d is an instance of Dequery
    expect(d[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(d[0].classList.contains("boxed")).toBe(true); // check for the 'boxed' class
    expect(d[0].classList.contains("task")).toBe(true); // check for the 'task' class
    expect(d[0].id).toBe("foo"); // check for the correct id
  });

  it("can create a <span> element with a single class", async () => {
    const s = await $<HTMLElement>("<span>", { class: "highlight" });
    expect(s).toBeInstanceOf(CallChainImpl); // check that s is an instance of Dequery
    expect(s[0].tagName).toBe("SPAN"); // check that the element is a <span>
    expect(s[0].classList.contains("highlight")).toBe(true); // check for the 'highlight' class
  });

  it("can create an <input> element with type and placeholder", async () => {
    const input = await $<HTMLInputElement>("<input>", {
      type: "text",
      placeholder: "Enter text",
    });
    expect(input).toBeInstanceOf(CallChainImpl); // check that input is an instance of Dequery
    expect((input[0] as HTMLInputElement).tagName).toBe("INPUT"); // check that the element is an <input>
    expect((input[0] as HTMLInputElement).type).toBe("text"); // check for the correct type
    expect((input[0] as HTMLInputElement).placeholder).toBe("Enter text"); // check for the correct placeholder
  });

  it("can create a <button> element with html content", async () => {
    const button = await $<HTMLElement>("<button>", { html: "Click me" });
    expect(button).toBeInstanceOf(CallChainImpl); // check that button is an instance of Dequery
    expect((button[0] as HTMLButtonElement).tagName).toBe("BUTTON"); // check that the element is a <button>
    expect((button[0] as HTMLButtonElement).innerHTML).toBe("Click me"); // check for the correct html content
  });

  it("can create a <p> element with multiple attributes", async () => {
    const p = await $<HTMLParagraphElement>("<p>", {
      class: "text",
      id: "paragraph",
      title: "Paragraph Title",
    });
    expect(p).toBeInstanceOf(CallChainImpl); // check that p is an instance of Dequery
    expect((p[0] as HTMLElement).tagName).toBe("P"); // check that the element is a <p>
    expect((p[0] as HTMLElement).classList.contains("text")).toBe(true); // check for the 'text' class
    expect((p[0] as HTMLElement).id).toBe("paragraph"); // check for the correct id
    expect((p[0] as HTMLElement).title).toBe("Paragraph Title"); // check for the correct title
  });

  it("can add a click event listener to a <button> element", async () => {
    const button = await $("<button>", { html: "Click me" });
    let clicked = false;
    await button.on("click", () => {
      clicked = true;
    });
    (button[0] as HTMLButtonElement).click(); // Updated to use button[0]
    expect(clicked).toBe(true); // check that the click event was triggered
  });

  it("can add a mouseover event listener to a <div> element", async () => {
    const div = await $<HTMLDivElement>("<div>", { class: "hoverable" });
    // Element must be in document BEFORE registering for delegated events
    document.body.appendChild(div[0]);
    let hovered = false;
    await div.on("mouseover", () => {
      hovered = true;
    });
    const event = new Event("mouseover", { bubbles: true });
    div[0].dispatchEvent(event);
    expect(hovered).toBe(true); // check that the mouseover event was triggered
    document.body.removeChild(div[0]);
  });

  it("can create a <div> element with text content", async () => {
    const div = await $<HTMLDivElement>("<div>", { text: "Hello World" });
    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].textContent).toBe("Hello World"); // check for the correct text content
  });

  it("can append a <span> element to a <div> element", async () => {
    const div = await $<HTMLElement>("<div>", { text: "Parent" });
    const span = await $<HTMLElement>("<span>", { text: "Child" });

    await div.append(span);

    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].textContent).toContain("Parent"); // check for the correct text content in div
    expect(div[0].querySelector("span")).not.toBeNull(); // check that a <span> is appended
    expect(div[0].querySelector("span")?.textContent).toBe("Child"); // check for the correct text content in span
  });

  it("does not append when the parameter is null", async () => {
    const div = await $<HTMLElement>("<div>Parent</div>");

    // @ts-ignore
    const x = await div.append(null);

    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].textContent).toBe("Parent"); // check that the text content remains unchanged
    expect(div[0].children.length).toBe(0); // check that no children are appended
  });

  it("does not append when the parameter is undefined", async () => {
    const div = await $<HTMLElement>("<div>Parent</div>");

    // @ts-ignore
    await div.append(undefined);

    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].textContent).toBe("Parent"); // check that the text content remains unchanged
    expect(div[0].children.length).toBe(0); // check that no children are appended
  });

  it("can check the length of elements", async () => {
    const div = await $<HTMLElement>("<div>", { text: "Parent" });
    const span = await $<HTMLElement>("<span>", { text: "Child" });

    await div.append(span);

    expect(div.length).toBe(1); // check that div has one child element
    expect(span.length).toBe(1); // check that span is a single element
  });

  it("can access elements using array-like indexing", async () => {
    const div = await $<HTMLElement>("<div>Parent</div>", { text: "Parent" });
    const span1 = await $<HTMLElement>("<span>Child 1</span>", {
      text: "Child 1",
    });
    const span2 = await $<HTMLElement>("<span>Child 2</span>", {
      text: "Child 2",
    });

    const markup = await div.html();

    console.log("markup", markup);

    const newMarkup = await div.append(span1).append(span2).html();

    console.log("newMarkup", newMarkup);

    expect(div[0]).toBeInstanceOf(HTMLElement); // check that the first element is an HTMLElement
    expect(div[0].tagName).toBe("DIV"); // check that the first element is a <div>
    expect(div[0].textContent).toContain("Parent"); // check for the correct text content in div

    const children = await div.children();

    expect(children.length).toBe(2);

    expect(children[0]).toBeInstanceOf(HTMLElement);
    expect(children[0].tagName).toBe("SPAN");
    expect(children[0].textContent).toBe("Child 1");

    expect(children[1]).toBeInstanceOf(HTMLElement);
    expect(children[1].tagName).toBe("SPAN");
    expect(children[1].textContent).toBe("Child 2");
  });

  it("can append a dom node to another element", async () => {
    const div = await $<HTMLElement>("<div>Parent</div>");
    const span = await $<HTMLElement>("<span>Child</span>");
    const spanNode = span[0]; // Get the DOM node from the Dequery object
    await div.append(spanNode);
    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].textContent).toContain("Parent"); // check for the correct text content in div
    expect(div[0].querySelector("span")).not.toBeNull(); // check that a <span> is appended
    expect(div[0].querySelector("span")?.textContent).toBe("Child"); // check for the correct text content in span
  });

  it("can update the text content of an element", async () => {
    const div = await $<HTMLElement>("<div>Old Text</div>");
    await div.update("New Text");
    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].textContent).toBe("New Text"); // check for the updated text content
  });

  it("can update the html content of an element", async () => {
    const div = await $<HTMLElement>("<div>Old HTML</div>");
    await div.update("<span>New HTML</span>");
    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].innerHTML).toBe("<span>New HTML</span>"); // check for the updated html content
  });

  it("can update with JSX", async () => {
    const div = await $<HTMLElement>("<div>Old JSX</div>");
    const jsxElement = <span>New JSX</span>; // Create a JSX element
    await div.update(jsxElement);
    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].innerHTML).toBe("<span>New JSX</span>"); // check for the updated html content
  });

  it("can update (replace) with a DOM node", async () => {
    const div = await $<HTMLElement>("<div>Old Node</div>");
    const newNode = document.createElement("span");
    newNode.textContent = "New Node";
    await div.update(newNode);
    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].innerHTML).toBe("<span>New Node</span>"); // check for the updated html content
  });

  it("can update with a dequery object", async () => {
    const div = await $<HTMLElement>("<div>Old Dequery</div>");
    const newDequery = await $<HTMLElement>("<span>New Dequery</span>");
    await div.update(newDequery);
    expect(div).toBeInstanceOf(CallChainImpl); // check that div is an instance of Dequery
    expect(div[0].tagName).toBe("DIV"); // check that the element is a <div>
    expect(div[0].innerHTML).toBe("<span>New Dequery</span>"); // check for the updated html content
  });

  it("can create a form with values and then set it", async () => {
    const formEl = await $("<form>");
    const input1 = await $("<input>", { name: "username" });
    const input2 = await $("<input>", { name: "password" });

    await formEl.append(input1).append(input2);

    // Set form values
    await formEl.form({ username: "testuser", password: "securepass" });

    // Check if the values are set correctly
    const formData = await formEl.form<{
      username: string;
      password: string;
    }>();

    console.log("formData", formData);
    expect(formData.username).toBe("testuser");
    expect(formData.password).toBe("securepass");
  });

  it("can set and get a textarea value using form()", async () => {
    const formEl = await $<HTMLFormElement>("<form>");
    const textarea = await $<HTMLTextAreaElement>("<textarea>", {
      name: "description",
    });

    await formEl.append(textarea);

    // Set form values including textarea
    await formEl.form({ description: "This is a test description." });

    // Check if the textarea value is set correctly using form()
    const formData = await formEl.form();
    expect(formData.description).toBe("This is a test description.");
  });
});

// Add this test to your el.test.tsx file:

describe("Event preservation test", () => {
  it("preserves onClick handlers on deeply nested elements during VDOM updates", async () => {
    const container = await $<HTMLDivElement>("<div>");
    // Attach to DOM so delegated events can bubble to document
    document.body.appendChild(container[0]);

    let clickCount = 0;
    const handleClick = (e: Event) => {
      e.preventDefault();
      clickCount++;
    };

    // Create initial nested structure with onClick handler
    const initialContent = (
      <div className="wrapper">
        <h2 className="title">
          <a href="#" onClick={handleClick} id="test-link">
            Initial Link Text
          </a>
        </h2>
        <p>Some content</p>
      </div>
    );

    // Update container with initial VDOM
    await container.update(initialContent);

    // Verify initial structure
    const initialLink = container[0].querySelector(
      "#test-link",
    ) as HTMLAnchorElement;
    expect(initialLink).not.toBeNull();
    expect(initialLink.textContent?.trim()).toBe("Initial Link Text");
    expect(initialLink.tagName).toBe("A");
    expect(initialLink.closest("h2")).not.toBeNull();

    // Test initial onClick handler works
    initialLink.click();
    expect(clickCount).toBe(1);

    // Update with modified VDOM - change classes, text, and attributes
    const updatedContent = (
      <div className="wrapper updated">
        <h2 className="title new-title" data-version="2">
          <a
            href="#updated"
            onClick={handleClick}
            id="test-link"
            className="updated-link"
          >
            Updated Link Text
          </a>
        </h2>
        <p>Updated content</p>
        <span>New element</span>
      </div>
    );

    // Update the container with new VDOM
    await container.update(updatedContent);

    // Verify structure was updated correctly
    const updatedLink = container[0].querySelector(
      "#test-link",
    ) as HTMLAnchorElement;
    expect(updatedLink).not.toBeNull();
    expect(updatedLink.textContent?.trim()).toBe("Updated Link Text");
    expect(updatedLink.className).toBe("updated-link");
    expect(updatedLink.href).toContain("#updated");

    // Verify parent elements were updated
    const updatedH2 = container[0].querySelector("h2") as HTMLHeadingElement;
    expect(updatedH2.className).toBe("title new-title");
    expect(updatedH2.getAttribute("data-version")).toBe("2");

    const updatedDiv = container[0].querySelector(".wrapper") as HTMLDivElement;
    expect(updatedDiv.className).toBe("wrapper updated");

    // Verify new content was added
    expect(container[0].querySelector("span")?.textContent).toBe("New element");
    expect(container[0].querySelector("p")?.textContent).toBe(
      "Updated content",
    );

    // CRITICAL TEST: Verify onClick handler still works after update
    updatedLink.click();
    expect(clickCount).toBe(2); // Should increment from 1 to 2

    // Test multiple clicks to ensure handler is fully functional
    updatedLink.click();
    updatedLink.click();
    expect(clickCount).toBe(4);

    console.log(
      `✅ Test passed: onClick handler preserved through ${clickCount} total clicks`,
    );
  });

  it("preserves multiple event handlers on nested elements during updates", async () => {
    const container = await $<HTMLDivElement>("<div>");
    // Attach to DOM so delegated events can bubble to document
    document.body.appendChild(container[0]);

    let clickCount = 0;
    let mouseoverCount = 0;

    const handleClick = (e: Event) => {
      e.preventDefault();
      clickCount++;
    };

    const handleMouseover = () => {
      mouseoverCount++;
    };

    // Initial nested structure with multiple events
    const initialContent = (
      <div className="container">
        <h2>
          <a
            href="#"
            onClick={handleClick}
            onFocus={() => { }}
            onMouseOver={handleMouseover}
            id="multi-event-link"
          >
            Multi-event Link
          </a>
        </h2>
      </div>
    );

    await container.update(initialContent);

    // Test initial handlers
    const initialLink = container[0].querySelector(
      "#multi-event-link",
    ) as HTMLAnchorElement;
    initialLink.click();
    initialLink.dispatchEvent(new Event("mouseover", { bubbles: true }));
    expect(clickCount).toBe(1);
    expect(mouseoverCount).toBe(1);

    // Update with changes
    const updatedContent = (
      <div className="container modified">
        <h2 className="updated">
          <a
            href="#modified"
            onClick={handleClick}
            onFocus={() => { }}
            onMouseOver={handleMouseover}
            id="multi-event-link"
            className="modified-link"
          >
            Modified Multi-event Link
          </a>
        </h2>
        <div>Additional content</div>
      </div>
    );

    await container.update(updatedContent);

    // Verify both handlers still work
    const updatedLink = container[0].querySelector(
      "#multi-event-link",
    ) as HTMLAnchorElement;
    expect(updatedLink.textContent?.trim()).toBe("Modified Multi-event Link");
    expect(updatedLink.className).toBe("modified-link");

    updatedLink.click();
    updatedLink.dispatchEvent(new Event("mouseover", { bubbles: true }));
    expect(clickCount).toBe(2);
    expect(mouseoverCount).toBe(2);
  });

  it("handles onClick when parent structure changes significantly", async () => {
    const container = await $<HTMLDivElement>("<div>");
    // Attach to DOM so delegated events can bubble to document
    document.body.appendChild(container[0]);

    let clickCount = 0;
    const handleClick = () => clickCount++;

    // Simple initial structure
    const initialContent = (
      <h2>
        <a href="#" onClick={handleClick} id="changing-link">
          Link
        </a>
      </h2>
    );

    await container.update(initialContent);

    // Test initial handler
    (container[0].querySelector("#changing-link") as HTMLAnchorElement).click();
    expect(clickCount).toBe(1);

    // Completely change parent structure but keep the link
    const updatedContent = (
      <div className="new-wrapper">
        <section>
          <header>
            <h2 className="new-header">
              <a href="#new" onClick={handleClick} id="changing-link">
                New Link
              </a>
            </h2>
          </header>
        </section>
        <footer>Footer content</footer>
      </div>
    );

    await container.update(updatedContent);

    // Verify handler still works despite major structure changes
    const updatedLink = container[0].querySelector(
      "#changing-link",
    ) as HTMLAnchorElement;
    expect(updatedLink.textContent?.trim()).toBe("New Link");

    updatedLink.click();
    expect(clickCount).toBe(2);
  });
});
