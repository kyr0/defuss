// @vitest-environment jsdom
import { $ } from "./dequery.js";

describe('$', () => {
  it('is defined', () => {
    expect($).toBeDefined();
  });

  it('implements all methods', () => { 
    expect($(document.body).attr).toBeInstanceOf(Function);
    expect($(document.body).val).toBeInstanceOf(Function);
    expect($(document.body).empty).toBeInstanceOf(Function);
    expect($(document.body).remove).toBeInstanceOf(Function);
    expect($(document.body).html).toBeInstanceOf(Function);
    expect($(document.body).addClass).toBeInstanceOf(Function);
    expect($(document.body).hasClass).toBeInstanceOf(Function);
    expect($(document.body).removeClass).toBeInstanceOf(Function);
    expect($(document.body).toggleClass).toBeInstanceOf(Function);
    expect($(document.body).replaceWithJsx).toBeInstanceOf(Function);
    expect($(document.body).on).toBeInstanceOf(Function);
    expect($(document.body).off).toBeInstanceOf(Function);
  });
});