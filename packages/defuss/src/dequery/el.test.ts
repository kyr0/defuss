// @vitest-environment jsdom
import { $, Dequery } from "./dequery.js";

describe('Element creation test', () => {
  it('can create a <div> element with class and id', () => {
    const d = $('<div>', { class: 'boxed task', id: "foo" });
    expect(d).toBeInstanceOf(Dequery); // check that d is an instance of Dequery
    expect((d.elements[0] as HTMLElement).tagName).toBe('DIV'); // check that the element is a <div>
    expect((d.elements[0] as HTMLElement).classList.contains('boxed')).toBe(true); // check for the 'boxed' class
    expect((d.elements[0] as HTMLElement).classList.contains('task')).toBe(true); // check for the 'task' class
    expect((d.elements[0] as HTMLElement).id).toBe('foo'); // check for the correct id
  });

  it('can create a <span> element with a single class', () => {
    const s = $('<span>', { class: 'highlight' });
    expect(s).toBeInstanceOf(Dequery); // check that s is an instance of Dequery
    expect((s.elements[0] as HTMLElement).tagName).toBe('SPAN'); // check that the element is a <span>
    expect((s.elements[0] as HTMLElement).classList.contains('highlight')).toBe(true); // check for the 'highlight' class
  });

  it('can create an <input> element with type and placeholder', () => {
    const input = $('<input>', { type: 'text', placeholder: 'Enter text' });
    expect(input).toBeInstanceOf(Dequery); // check that input is an instance of Dequery
    expect((input.elements[0] as HTMLInputElement).tagName).toBe('INPUT'); // check that the element is an <input>
    expect((input.elements[0] as HTMLInputElement).type).toBe('text'); // check for the correct type
    expect((input.elements[0] as HTMLInputElement).placeholder).toBe('Enter text'); // check for the correct placeholder
  });

  it('can create a <button> element with inner HTML', () => {
    const button = $('<button>', { innerHTML: 'Click me' });
    expect(button).toBeInstanceOf(Dequery); // check that button is an instance of Dequery
    expect((button.elements[0] as HTMLButtonElement).tagName).toBe('BUTTON'); // check that the element is a <button>
    expect((button.elements[0] as HTMLButtonElement).innerHTML).toBe('Click me'); // check for the correct inner HTML
  });

  it('can create a <p> element with multiple attributes', () => {
    const p = $('<p>', { class: 'text', id: 'paragraph', title: 'Paragraph Title' });
    expect(p).toBeInstanceOf(Dequery); // check that p is an instance of Dequery
    expect((p.elements[0] as HTMLElement).tagName).toBe('P'); // check that the element is a <p>
    expect((p.elements[0] as HTMLElement).classList.contains('text')).toBe(true); // check for the 'text' class
    expect((p.elements[0] as HTMLElement).id).toBe('paragraph'); // check for the correct id
    expect((p.elements[0] as HTMLElement).title).toBe('Paragraph Title'); // check for the correct title
  });

  it('can add a click event listener to a <button> element', () => {
    const button = $('<button>', { innerHTML: 'Click me' });
    let clicked = false;
    button.on('click', () => { clicked = true; });
    (button.elements[0] as HTMLButtonElement).click();
    expect(clicked).toBe(true); // check that the click event was triggered
  });

  it('can add a mouseover event listener to a <div> element', () => {
    const div = $('<div>', { class: 'hoverable' });
    let hovered = false;
    div.on('mouseover', () => { hovered = true; });
    const event = new Event('mouseover');
    (div.elements[0] as HTMLElement).dispatchEvent(event);
    expect(hovered).toBe(true); // check that the mouseover event was triggered
  });

  it('can create a <div> element with text content', () => {
    const div = $('<div>', { textContent: 'Hello World' });
    expect(div).toBeInstanceOf(Dequery); // check that div is an instance of Dequery
    expect((div.elements[0] as HTMLElement).tagName).toBe('DIV'); // check that the element is a <div>
    expect((div.elements[0] as HTMLElement).textContent).toBe('Hello World'); // check for the correct text content
  });
});