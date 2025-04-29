// @vitest-environment jsdom
import { $ } from "./dequery.js";

describe('$', () => {
  it('is defined', async () => {
    expect($).toBeDefined();
  });

  it('implements all methods', async () => {
    expect($(document.body).attr).toBeInstanceOf(Function);
    expect($(document.body).val).toBeInstanceOf(Function);
    expect($(document.body).empty).toBeInstanceOf(Function);
    expect($(document.body).remove).toBeInstanceOf(Function);
    expect($(document.body).html).toBeInstanceOf(Function);
    expect($(document.body).addClass).toBeInstanceOf(Function);
    expect($(document.body).hasClass).toBeInstanceOf(Function);
    expect($(document.body).removeClass).toBeInstanceOf(Function);
    expect($(document.body).toggleClass).toBeInstanceOf(Function);
    expect($(document.body).replaceWith).toBeInstanceOf(Function);
    expect($(document.body).on).toBeInstanceOf(Function);
    expect($(document.body).off).toBeInstanceOf(Function);
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
    const filteredElements = await $(container).children().filter('.test');

    // check if the filter method returns the correct number of elements
    expect(filteredElements.elements.length).toBe(2);

    // clean up
    document.body.removeChild(container);
  });
});