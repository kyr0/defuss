// @vitest-environment jsdom
import { $ } from "./query.js";

describe('CSS class manipulation', () => {
  it('can toggle a CSS class', () => {
    $(document.body).toggleClass('lol-t'); 
    expect(document.body.querySelector('.lol-t')).toBeDefined();
  });

  it('can untoggle a CSS class', () => {
    $(document.body).toggleClass('lol-ut');
    $(document.body).toggleClass('lol-ut');
    expect(document.body.querySelector('.lol-ut')).toEqual(null);
  });

  it('can check for a class', () => {
    $(document.body).toggleClass('lol-c');
    expect(document.body.querySelector('.lol-c')).toBeDefined();
    expect($(document.body).hasClass('lol-c')).toEqual(true);
  });

  it('can check for a non-existing class', () => {
    $(document.body).toggleClass('lol-cn');
    $(document.body).toggleClass('lol-cn');
    expect($(document.body).hasClass('lol-cn')).toEqual(false);
  });

  it('can add one class', () => {
    $(document.body).addClass('oneClass');
    expect($(document.body).hasClass('oneClass')).toEqual(true);
  });

  it('can add many classes', () => {
    $(document.body).addClass(['oneClass1', 'nextClass1']);
    expect($(document.body).hasClass('oneClass1')).toEqual(true);
    expect($(document.body).hasClass('nextClass1')).toEqual(true);
  });

  it('can remove one class', () => {
    $(document.body).addClass('oneClass2');
    $(document.body).removeClass('oneClass2');
    expect($(document.body).hasClass('oneClass2')).toEqual(false);
  });

  it('can remove many classes', () => {
    $(document.body).addClass(['oneClass3', 'nextClass3']);
    $(document.body).removeClass(['oneClass3', 'nextClass3']);
    expect($(document.body).hasClass('oneClass3')).toEqual(false);
    expect($(document.body).hasClass('nextClass3')).toEqual(false);
  });
});