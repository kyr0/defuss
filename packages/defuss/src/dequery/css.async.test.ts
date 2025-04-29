// @vitest-environment jsdom
import { a$ } from "./dequery_async.js";

describe('CSS class manipulation', async () => {
  it('can toggle a CSS class', async () => {
    await a$(document.body).toggleClass('lol-t');
    expect(document.body.querySelector('.lol-t')).toBeDefined();
  });

  it('can untoggle a CSS class', async () => {
    await a$(document.body).toggleClass('lol-ut');
    await a$(document.body).toggleClass('lol-ut');
    expect(document.body.querySelector('.lol-ut')).toEqual(null);
  });

  it('can check for a class', async () => {
    await a$(document.body).toggleClass('lol-c');
    expect(document.body.querySelector('.lol-c')).toBeDefined();
    expect(await a$(document.body).hasClass('lol-c')).toEqual(true);
  });

  it('can check for a non-existing class', async () => {
    await a$(document.body).toggleClass('lol-cn');
    await a$(document.body).toggleClass('lol-cn');
    expect(await a$(document.body).hasClass('lol-cn')).toEqual(false);
  });

  it('can add one class', async () => {
    await a$(document.body).addClass('oneClass');
    expect(await a$(document.body).hasClass('oneClass')).toEqual(true);
  });

  it('can add many classes', async () => {
    await a$(document.body).addClass(['oneClass1', 'nextClass1']);
    expect(await a$(document.body).hasClass('oneClass1')).toEqual(true);
    expect(await a$(document.body).hasClass('nextClass1')).toEqual(true);
  });

  it('can remove one class', async () => {
    await a$(document.body).addClass('oneClass2');
    await a$(document.body).removeClass('oneClass2');
    expect(await a$(document.body).hasClass('oneClass2')).toEqual(false);
  });

  it('can remove many classes', async () => {
    await a$(document.body).addClass(['oneClass3', 'nextClass3']);
    await a$(document.body).removeClass(['oneClass3', 'nextClass3']);
    expect(await a$(document.body).hasClass('oneClass3')).toEqual(false);
    expect(await a$(document.body).hasClass('nextClass3')).toEqual(false);
  });
});