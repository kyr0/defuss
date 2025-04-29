// @vitest-environment jsdom
import { $ } from "./dequery.js";

describe('CSS class manipulation', async () => {
  it('can toggle a CSS class', async () => {
    await $(document.body).toggleClass('lol-t');
    expect(document.body.querySelector('.lol-t')).toBeDefined();
  });

  it('can untoggle a CSS class', async () => {
    await $(document.body).toggleClass('lol-ut');
    await $(document.body).toggleClass('lol-ut');
    expect(document.body.querySelector('.lol-ut')).toEqual(null);
  });

  it('can check for a class', async () => {
    await $(document.body).toggleClass('lol-c');
    expect(document.body.querySelector('.lol-c')).toBeDefined();
    expect(await $(document.body).hasClass('lol-c')).toEqual(true);
  });

  it('can check for a non-existing class', async () => {
    await $(document.body).toggleClass('lol-cn');
    await $(document.body).toggleClass('lol-cn');
    expect(await $(document.body).hasClass('lol-cn')).toEqual(false);
  });

  it('can add one class', async () => {
    await $(document.body).addClass('oneClass');
    expect(await $(document.body).hasClass('oneClass')).toEqual(true);
  });

  it('can add many classes', async () => {
    await $(document.body).addClass(['oneClass1', 'nextClass1']);
    expect(await $(document.body).hasClass('oneClass1')).toEqual(true);
    expect(await $(document.body).hasClass('nextClass1')).toEqual(true);
  });

  it('can remove one class', async () => {
    await $(document.body).addClass('oneClass2');
    await $(document.body).removeClass('oneClass2');
    expect(await $(document.body).hasClass('oneClass2')).toEqual(false);
  });

  it('can remove many classes', async () => {
    await $(document.body).addClass(['oneClass3', 'nextClass3']);
    await $(document.body).removeClass(['oneClass3', 'nextClass3']);
    expect(await $(document.body).hasClass('oneClass3')).toEqual(false);
    expect(await $(document.body).hasClass('nextClass3')).toEqual(false);
  });
});