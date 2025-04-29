// @vitest-environment jsdom
import { a$ } from "./dequery_async.js";

describe('$', () => {
  it('is defined', async () => {
    expect(a$).toBeDefined();
  });

  it('implements all methods', async () => {
    expect(a$(document.body).attr).toBeInstanceOf(Function);
    expect(a$(document.body).val).toBeInstanceOf(Function);
    expect(a$(document.body).empty).toBeInstanceOf(Function);
    expect(a$(document.body).remove).toBeInstanceOf(Function);
    expect(a$(document.body).html).toBeInstanceOf(Function);
    expect(a$(document.body).addClass).toBeInstanceOf(Function);
    expect(a$(document.body).hasClass).toBeInstanceOf(Function);
    expect(a$(document.body).removeClass).toBeInstanceOf(Function);
    expect(a$(document.body).toggleClass).toBeInstanceOf(Function);
    expect(a$(document.body).replaceWith).toBeInstanceOf(Function);
    expect(a$(document.body).on).toBeInstanceOf(Function);
    expect(a$(document.body).off).toBeInstanceOf(Function);
  });

  it('filters elements correctly', async () => {
    // create a test container
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="test"></div>
      <div class="test"></div>
      <div class="not-test"></div>
    `;
    document.body.appendChild(container);

    // use the filter method to select elements with class 'test'
    const filteredElements = await a$(container).children().filter('.test');

    // check if the filter method returns the correct number of elements
    expect(filteredElements.elements.length).toBe(2);

    // clean up
    document.body.removeChild(container);
  });
});