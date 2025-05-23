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
    let hovered = false;
    await div.on("mouseover", () => {
      hovered = true;
    });
    const event = new Event("mouseover");
    div[0].dispatchEvent(event); // Updated to use div[0]
    expect(hovered).toBe(true); // check that the mouseover event was triggered
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
