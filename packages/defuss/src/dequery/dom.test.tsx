// @vitest-environment jsdom
import type { Globals, Ref } from "../render/index.js";
import { jsx, renderIsomorphic } from "../render/isomorph.js";
import { $ } from "./query.js";

describe('General DOM manipulation', () => {
  it('can update children of a defuss-created DOM element', () => {
    const el = renderIsomorphic(<div>Check</div>, undefined, globalThis as Globals) as Element;
    $(el).html(<div>Check2</div>);
    expect(el.childNodes[0].textContent).toEqual('Check2');
  });

  it('can empty an element', () => {
    document.body.innerHTML = '<div>Test</div>';
    $(document.body).empty();
    expect(document.body.childNodes[0]).toBeFalsy();
  });

  it('can set an attribute', () => {
    $(document.body).attr('foo', 'bar');
    expect(document.body.getAttribute('foo')).toEqual('bar');
  });

  it('can get an attribute', () => {
    $(document.body).attr('foo2', 'bar');
    expect($(document.body).attr('foo2')).toEqual('bar');
  });

  it('can get an input value', () => {
    const inputRef: Ref = {};
    renderIsomorphic(<input ref={inputRef} value="123" />, document.body, globalThis as Globals) as Element;
    expect($(inputRef.current!).val()).toEqual('123');
  });

  it('can set an input value', () => {
    const inputRef: Ref = {};
    renderIsomorphic(<input ref={inputRef} value="123" />, document.body, globalThis as Globals) as Element;
    $(inputRef.current!).val('345');
    expect($(inputRef.current!).val()).toEqual('345');
  });

  it('can get a checkbox checked value', () => {
    const inputRef: Ref = {};
    renderIsomorphic(<input ref={inputRef} type="checkbox" checked />, document.body, globalThis as Globals) as Element;
    expect($(inputRef.current!).val()).toEqual(true);
  });

  it('can set a checkbox checked value', () => {
    const inputRef: Ref = {};
    renderIsomorphic(<input ref={inputRef} type="checkbox" />, document.body, globalThis as Globals) as Element;
    $(inputRef.current!).val(true);
    expect($(inputRef.current!).val()).toEqual(true);
  });

  it('can replace an element with another', () => {
    const divRef: any = {};
    renderIsomorphic(<div ref={divRef}>Check</div>, document.body, globalThis as Globals) as Element;
    divRef.current = $(divRef.current).replaceWith(<input tabIndex="-2" />);
    expect($(divRef.current).attr('tabIndex')).toEqual('-2');
  });

  it('remove an element', () => {
    $(document.body).remove();
    expect(document.body).toBeFalsy();
  });

  it('can register for an event programmatically', () => {
    const elRef: any = {};
    renderIsomorphic(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      undefined,
      globalThis as Globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    $(elRef.current).on('click', onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(1);
  });

  it('can *un*register for an event programmatically', () => {
    const elRef: any = {};
    renderIsomorphic(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      undefined,
      globalThis as Globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    $(elRef.current).on('click', onClick);
    $(elRef.current).off('click', onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(0);
  });
});