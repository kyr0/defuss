// @vitest-environment jsdom
import { $, DequeryChain } from "./dequery.js";

describe('Element creation test', async () => {
  it('can create a <div> element with class and id', async () => {
    const d = await $('<div>', { class: 'boxed task', id: "foo" });
    expect(d).toBeInstanceOf(DequeryChain); // check that d is an instance of Dequery
    expect((d.elements[0] as HTMLElement).tagName).toBe('DIV'); // check that the element is a <div>
    expect((d.elements[0] as HTMLElement).classList.contains('boxed')).toBe(true); // check for the 'boxed' class
    expect((d.elements[0] as HTMLElement).classList.contains('task')).toBe(true); // check for the 'task' class
    expect((d.elements[0] as HTMLElement).id).toBe('foo'); // check for the correct id
  });

  it('can create a <span> element with a single class', async () => {
    const s = await $('<span>', { class: 'highlight' });
    expect(s).toBeInstanceOf(DequeryChain); // check that s is an instance of Dequery
    expect((s.elements[0] as HTMLElement).tagName).toBe('SPAN'); // check that the element is a <span>
    expect((s.elements[0] as HTMLElement).classList.contains('highlight')).toBe(true); // check for the 'highlight' class
  });

  it('can create an <input> element with type and placeholder', async () => {
    const input = await $('<input>', { type: 'text', placeholder: 'Enter text' });
    expect(input).toBeInstanceOf(DequeryChain); // check that input is an instance of Dequery
    expect((input.elements[0] as HTMLInputElement).tagName).toBe('INPUT'); // check that the element is an <input>
    expect((input.elements[0] as HTMLInputElement).type).toBe('text'); // check for the correct type
    expect((input.elements[0] as HTMLInputElement).placeholder).toBe('Enter text'); // check for the correct placeholder
  });

  it('can create a <button> element with html content', async () => {
    const button = await $('<button>', { html: 'Click me' });
    expect(button).toBeInstanceOf(DequeryChain); // check that button is an instance of Dequery
    expect((button.elements[0] as HTMLButtonElement).tagName).toBe('BUTTON'); // check that the element is a <button>
    expect((button.elements[0] as HTMLButtonElement).innerHTML).toBe('Click me'); // check for the correct html content
  });

  it('can create a <p> element with multiple attributes', async () => {
    const p = await $('<p>', { class: 'text', id: 'paragraph', title: 'Paragraph Title' });
    expect(p).toBeInstanceOf(DequeryChain); // check that p is an instance of Dequery
    expect((p.elements[0] as HTMLElement).tagName).toBe('P'); // check that the element is a <p>
    expect((p.elements[0] as HTMLElement).classList.contains('text')).toBe(true); // check for the 'text' class
    expect((p.elements[0] as HTMLElement).id).toBe('paragraph'); // check for the correct id
    expect((p.elements[0] as HTMLElement).title).toBe('Paragraph Title'); // check for the correct title
  });

  it('can add a click event listener to a <button> element', async () => {
    const button = await $('<button>', { html: 'Click me' });
    let clicked = false;
    console.log("btn", button);
    await button.on('click', () => { clicked = true; });
    (button.elements[0] as HTMLButtonElement).click();
    expect(clicked).toBe(true); // check that the click event was triggered
  });

  it('can add a mouseover event listener to a <div> element', async () => {
    const div = await $('<div>', { class: 'hoverable' });
    let hovered = false;
    await div.on('mouseover', () => { hovered = true; });
    const event = new Event('mouseover');
    (div.elements[0] as HTMLElement).dispatchEvent(event);
    expect(hovered).toBe(true); // check that the mouseover event was triggered
  });

  it('can create a <div> element with text content', async () => {
    const div = await $('<div>', { text: 'Hello World' });
    expect(div).toBeInstanceOf(DequeryChain); // check that div is an instance of Dequery
    expect((div.elements[0] as HTMLElement).tagName).toBe('DIV'); // check that the element is a <div>
    expect((div.elements[0] as HTMLElement).textContent).toBe('Hello World'); // check for the correct text content
  });

  it('can append a <span> element to a <div> element', async () => {
    const div = await $('<div>', { text: 'Parent' });
    const span = await $('<span>', { text: 'Child' });

    await div.append(span);

    console.log("div", div.elements[0]);

    expect(div).toBeInstanceOf(DequeryChain); // check that div is an instance of Dequery
    expect((div.elements[0] as HTMLElement).tagName).toBe('DIV'); // check that the element is a <div>
    expect((div.elements[0] as HTMLElement).textContent).toContain('Parent'); // check for the correct text content in div
    expect((div.elements[0] as HTMLElement).querySelector('span')).not.toBeNull(); // check that a <span> is appended
    expect((div.elements[0] as HTMLElement).querySelector('span')?.textContent).toBe('Child'); // check for the correct text content in span
  });

  it('does not append when the parameter is null', async () => {
    const div = await $('<div>Parent</div>');

    // @ts-ignore
    const x = await div.append(null);

    expect(div).toBeInstanceOf(DequeryChain); // check that div is an instance of Dequery
    expect((div.elements[0] as HTMLElement).tagName).toBe('DIV'); // check that the element is a <div>
    expect((div.elements[0] as HTMLElement).textContent).toBe('Parent'); // check that the text content remains unchanged
    expect((div.elements[0] as HTMLElement).children.length).toBe(0); // check that no children are appended
  });

  it('does not append when the parameter is undefined', async () => {
    const div = await $('<div>Parent</div>');

    // @ts-ignore
    await div.append(undefined);

    expect(div).toBeInstanceOf(DequeryChain); // check that div is an instance of Dequery
    expect((div.elements[0] as HTMLElement).tagName).toBe('DIV'); // check that the element is a <div>
    expect((div.elements[0] as HTMLElement).textContent).toBe('Parent'); // check that the text content remains unchanged
    expect((div.elements[0] as HTMLElement).children.length).toBe(0); // check that no children are appended
  });

  it('can check the length of elements', async () => {
    const div = await $('<div>', { text: 'Parent' });
    const span = await $('<span>', { text: 'Child' });

    await div.append(span);

    expect(div.length).toBe(1); // check that div has one child element
    expect(span.length).toBe(1); // check that span is a single element
  });

  it('can access elements using array-like indexing', async () => {
    const div = await $('<div>Parent</div>', { text: 'Parent' });
    const span1 = await $('<span>Child 1</span>', { text: 'Child 1' });
    const span2 = await $('<span>Child 2</span>', { text: 'Child 2' });

    await div.append(span1).append(span2);

    expect(div[0]).toBeInstanceOf(HTMLElement); // check that the first element is an HTMLElement
    expect((div[0]).tagName).toBe('DIV'); // check that the first element is a <div>
    expect((div[0]).textContent).toContain('Parent'); // check for the correct text content in div

    const children = await div.children();

    expect(children.length).toBe(2);

    expect(children[0]).toBeInstanceOf(HTMLElement);
    expect((children[0]).tagName).toBe('SPAN');
    expect((children[0]).textContent).toBe('Child 1');

    expect(children[1]).toBeInstanceOf(HTMLElement);
    expect((children[1]).tagName).toBe('SPAN');
    expect((children[1]).textContent).toBe('Child 2');
  });

  it('can create a form with values and then set it', async () => {
    const form = await $('<form>');
    const input1 = await $('<input>', { name: 'username' });
    const input2 = await $('<input>', { name: 'password' });

    await form.append(input1).append(input2);

    // Set form values
    await form.form({ username: 'testuser', password: 'securepass' });

    // Check if the values are set correctly
    const formData = await form.form();

    console.log("formData", formData);
    expect(formData.username).toBe('testuser');
    expect(formData.password).toBe('securepass');
  });

  it('can set and get a textarea value using form()', async () => {
    const form = await $('<form>');
    const textarea = await $('<textarea>', { name: 'description' });

    await form.append(textarea);

    // Set form values including textarea
    await form.form({ description: 'This is a test description.' });

    // Check if the textarea value is set correctly using form()
    const formData = await form.form();
    expect(formData.description).toBe('This is a test description.');
  });
});