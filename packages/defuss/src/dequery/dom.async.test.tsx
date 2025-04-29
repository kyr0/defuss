// @vitest-environment jsdom
import { createRef, type Globals, type Ref } from "../render/index.js";
import { renderIsomorphicSync } from "../render/isomorph.js";
import { a$ } from "./dequery_async.js";

describe('General DOM manipulation', async() => {
  it('can update children of a defuss-created DOM element', async() => {
    const el = renderIsomorphicSync(<div>Check</div>, undefined, globalThis as Globals) as Element;
    await a$(el).html(<div>Check2</div>);
    expect(el.childNodes[0].textContent).toEqual('Check2');
  });

  it('can empty an element', async() => {
    document.body.innerHTML = '<div>Test</div>';
    await a$(document.body).empty();
    expect(document.body.childNodes[0]).toBeFalsy();
  });

  it('can set an attribute', async() => {
    await a$(document.body).attr('foo', 'bar');
    expect(document.body.getAttribute('foo')).toEqual('bar');
  });

  it('can get an attribute', async() => {
    await a$(document.body).attr('foo2', 'bar');
    expect(a$(document.body).attr('foo2')).toEqual('bar');
  });

  it('can get an input value', async() => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(<input ref={inputRef} value="123" />, document.body, globalThis as Globals) as Element;
    expect(await a$(inputRef.current!).val()).toEqual('123');
  });

  it('can set an input value', async() => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(<input ref={inputRef} value="123" />, document.body, globalThis as Globals) as Element;
    await a$(inputRef.current!).val('345');
    expect(await a$(inputRef.current!).val()).toEqual('345');
  });

  it('can get a checkbox checked value', async() => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(<input ref={inputRef} type="checkbox" checked />, document.body, globalThis as Globals) as Element;
    expect(await a$(inputRef.current!).val()).toEqual(true);
  });

  it('can set a checkbox checked value', async() => {
    const inputRef: Ref = createRef();
    renderIsomorphicSync(<input ref={inputRef} type="checkbox" />, document.body, globalThis as Globals) as Element;
    await a$(inputRef.current!).val(true);
    expect(await a$(inputRef.current!).val()).toEqual(true);
  });

  it('can replace an element with another', async() => {
    const divRef: any = {};
    renderIsomorphicSync(<div ref={divRef}>Check</div>, document.body, globalThis as Globals) as Element;
    divRef.current = await a$(divRef.current).replaceWith(<input tabIndex="-2" />);
    expect(await a$(divRef.current).attr('tabIndex')).toEqual('-2');
  });

  it('remove an element', async() => {
    await a$(document.body).remove();
    expect(document.body).toBeFalsy();
  });

  it('can register for an event programmatically', async() => {
    const elRef: any = {};
    renderIsomorphicSync(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      undefined,
      globalThis as Globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    await a$(elRef.current).on('click', onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(1);
  });

  it('can *un*register for an event programmatically', async() => {
    const elRef: any = {};
    renderIsomorphicSync(
      <button type="button" ref={elRef}>
        Click me
      </button>,
      undefined,
      globalThis as Globals,
    ) as Element;

    const onClick = vi.fn(() => {});
    await a$(elRef.current).on('click', onClick);
    await a$(elRef.current).off('click', onClick);

    elRef.current.click();

    expect(onClick.mock.calls.length).toEqual(0);
  });

  it('can set and get a property programmatically', async() => {
    const elRef: any = {};
    renderIsomorphicSync(
      <input type="text" ref={elRef} />,
      undefined,
      globalThis as Globals,
    ) as Element;

    await a$(elRef.current).prop('value', 'Hello World');
    const value = await a$(elRef.current).prop('value');

    expect(value).toEqual('Hello World');
  });
});