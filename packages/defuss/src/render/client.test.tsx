// @vitest-environment jsdom
import { render, renderToString } from './client.js'
import type { Ref, Props, VNode } from './client.js'
import { getRenderer, createRef } from './isomorph.js'
 
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

customElements.define( 
  'my-paragraph', 
  class extends HTMLElement {
    constructor() {
      super()

      const template = render(<p>Foo</p>) as Element

      this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true))
    }
  },
)

describe('client render', () => {
  it('can render', () => {
    const el: Element = render(
      <html lang='en'>
        <head></head>
        <body></body>
      </html>,
    ) as Element

    expect(render).toBeDefined()
    expect(el.nodeName).toEqual('HTML')
  })

  it('can renderToString', () => {
    const html: string = renderToString(
      render(
        <html lang='en'>
          <head></head>
          <body></body>
        </html>,
      ) as Element,
    )

    expect(html).toBeDefined()
  })
})

describe('Renderer create operation', () => {
  let parentDOMElement: Element

  beforeEach(() => {
    parentDOMElement = document.createElement('div') as unknown as Element
  })

  it('renders a <ul> list (JSX.Element extends IVirtualNode) as a child of a DOM element', () => {
    const list = (
      <ul id="123">
        <li>Foo</li>
      </ul>
    )

    render(list, parentDOMElement)

    expect((parentDOMElement.childNodes[0] as HTMLLIElement).id).toEqual('123')
    expect((parentDOMElement.childNodes[0] as HTMLLIElement).childNodes[0].nodeName).toEqual('LI')
  })
})

describe('Functional components', () => {
  let parentDOMElement: Element
  beforeEach(() => {
    parentDOMElement = document.createElement('div') as unknown as Element
  })

  it('can render functional components', () => {
    const FC = () => (
      <fragment>
        <div id="123">Foo</div>
        {/* huhuhu */}
        <div id="abc">Foo2</div>
      </fragment>
    )

    const someFc = <FC />
    render(someFc, parentDOMElement)

    expect((parentDOMElement.childNodes[0] as HTMLDivElement).id).toEqual('123')
    expect((parentDOMElement.childNodes[0] as HTMLDivElement).textContent).toEqual('Foo')
    expect((parentDOMElement.childNodes[1] as HTMLDivElement).id).toEqual('abc')
    expect((parentDOMElement.childNodes[1] as HTMLDivElement).textContent).toEqual('Foo2')
  })

  it('exposes the renderer object reference on each element created', () => {
    const FC = () => (
      <fragment>
        <div id="123">Foo</div>
        {/* huhuhu */}
        <div id="abc">Foo2</div>
      </fragment>
    )

    const someFc = <FC />
    render(someFc, parentDOMElement)

    expect((parentDOMElement.childNodes[0] as HTMLElement).nodeName).toEqual('DIV')
  })
})

describe('Renderer an fragment', () => {
  let parentDOMElement: Element

  beforeEach(() => {
    parentDOMElement = document.createElement('div') as Element
  })

  it('renders a <fragment> (JSX.Element extends IVirtualNode) as a child of a DOM element, renderer have to skip them', () => {
    const wrappedWithFragment = (
      <fragment>
        <fragment>
          <div id="123">Foo</div>
        </fragment>
      </fragment>
    )

    render(wrappedWithFragment, parentDOMElement)

    expect((parentDOMElement.childNodes[0] as HTMLDivElement).id).toEqual('123')
    expect((parentDOMElement.childNodes[0] as HTMLDivElement).textContent).toEqual('Foo')
  })

  it('renders a <> fragment (JSX.Element extends IVirtualNode) as a child of a DOM element, renderer have to skip them', () => {
    const wrappedWithFragment = (
      <>
        {/* biome-ignore lint/complexity/noUselessFragments: <explanation> */}
        <>
          <div id="123">Foo</div>
        </>
      </>
    )

    render(wrappedWithFragment, parentDOMElement)

    expect((parentDOMElement.childNodes[0] as HTMLDivElement).id).toEqual('123')
    expect((parentDOMElement.childNodes[0] as HTMLDivElement).textContent).toEqual('Foo')
  })
})

describe('VirtualDOM', () => {
  it('transforms a <ul> list into JSX.Element which extends IVirtualNode', () => {
    const list = (
      <ul>
        <li id="123" />
      </ul>
    )

    expect(list).toBeDefined()
    expect(list.children).toBeDefined()
    expect(list.children.length).toBe(1)
  })

  it('can render an array of elements', () => {
    const list = [
      <ul>
        <li id="123" />
      </ul>,
      <div />,
    ]

    expect(list).toBeDefined()
    expect(list.length).toBe(2)
  })

  it('can render to document.body', () => {
    const divRef = createRef<HTMLDivElement>();
    expect((render(<div ref={divRef} />, document.body) as Element).nodeName).toEqual('DIV')
    expect(divRef.current!.nodeName).toEqual('DIV')
    expect(divRef.current!.parentNode!.childNodes[0]).toEqual(divRef.current)
  })

  it('can render text to document.body', () => {
    expect(render('Mesg', document.body)!.nodeName).toEqual('#text')
    expect(document.documentElement.textContent).toEqual('Mesg')
  })

  it('can render Text', () => {
    expect(render('Foo')).toBeDefined()
    expect(render('Foo')!.nodeName).toEqual('#text')
  }) 

  it('can render an Array of elements', () => {
    expect(render([<div>A</div>, <div>B</div>])).toBeDefined()
    expect(render([<div>A</div>, <div>B</div>])).toBeInstanceOf(Array)
    expect((render([<div>A</div>, <div>B</div>]) as unknown as Array<any>).length).toBe(2)
  })

  it('can render SVG elements', () => {
    expect(
      (
        render(
          <svg className="star__svg" viewBox="0 0 32 32">
            <path className="star__svg__path"></path>
            <rect fill="none" width="32" height="32"></rect>
            <use xlinkHref="//wiki.selfhtml.org/wiki/SVG/Elemente/Verweise" xlinkTitle="zurück zum Wiki-Artikel">
              <text x="140" y="60">
                zurück zum Wiki-Artikel (mit XLink:href)
              </text>
            </use>
          </svg>,
        ) as Element
      ).nodeName,
    ).toEqual('svg')
  })

  it('can render SVG elements to string', () => {
    expect(
      renderToString(
        render(
          <svg
            className="star__svg"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 32 32"
          >
            <path className="star__svg__path" />
            <rect fill="none" width="32" height="32" />
            <use xlinkHref="//wiki.selfhtml.org/wiki/SVG/Elemente/Verweise" xlinkTitle="zurück zum Wiki-Artikel">
              <text x="140" y="60">
                zurück zum Wiki-Artikel (mit XLink:href)
              </text>
            </use>
          </svg>,
        ) as Element,
      ), 
    ).toEqual(
      // JSDOM renders xmlns twice, which is a bug in thier impl.
      '<svg xmlns="http://www.w3.org/2000/svg" class="star__svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32"><path class="star__svg__path"/><rect fill="none" width="32" height="32"/><use xlink:href="//wiki.selfhtml.org/wiki/SVG/Elemente/Verweise" xlink:title="zurück zum Wiki-Artikel"><text x="140" y="60">zurück zum Wiki-Artikel (mit XLink:href)</text></use></svg>',
    )
  })

  it('can render undefined values', () => {
    expect((render(undefined) as Text).nodeName).toEqual('#text')
  })

  it('can render null values', () => {
    expect(render(<div>{null}</div>)).toBeTruthy()
  })

  it('can render refs', () => {
    const divRef = createRef<Element>();

    expect((render(<div ref={divRef} />) as Element).nodeName).toEqual('DIV')
    expect(divRef.current!.nodeName).toEqual('DIV')
  })

  it('can attach to events implicitly and handlers get called', () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const onClick = vi.fn(() => {})

    expect(
      (render(<button label="button" type="button" ref={buttonRef} onClick={onClick} />) as Element).nodeName,
    ).toEqual('BUTTON')
    expect(buttonRef.current!.nodeName).toEqual('BUTTON')

    buttonRef.current!.click()

    expect(onClick.mock.calls.length).toBe(1)
  })

  it('can attach to events implicitly with capture and handlers get called', () => {
    const buttonRef = createRef<HTMLButtonElement>()
    const onClick = vi.fn(() => {})

    expect(
      (render(<button label="button" type="button" ref={buttonRef} onClickCapture={onClick} />) as Element).nodeName,
    ).toEqual('BUTTON')
    expect(buttonRef.current.nodeName).toEqual('BUTTON')

    buttonRef.current?.click()

    expect(onClick.mock.calls.length).toBe(1)
  })

  it('can apply many classes at once', () => {
    const el: Element = render(<button label="button" type="button" class={['a', 'b']} />) as HTMLButtonElement

    expect(el.nodeName).toEqual('BUTTON')
    expect(el.classList.contains('a')).toBe(true)
    expect(el.classList.contains('b')).toBe(true)
  })

  it('can apply many classes at once - with React syntax', () => {
    const el: Element = render(<button label="button" type="button" className={['a', 'b']} />) as HTMLButtonElement

    expect(el.nodeName).toEqual('BUTTON')
    expect(el.classList.contains('a')).toBe(true)
    expect(el.classList.contains('b')).toBe(true)
  })

  it('can render undefined attributes', () => {
    const el: Element = render(<button value={undefined as any} label="foo" type="button" />) as HTMLButtonElement

    expect(el.nodeName).toEqual('BUTTON')
  })

  it('can render style props', () => {
    const el: HTMLButtonElement = render(
      <button
        label="button"
        type="button"
        style={{
          border: '1px solid #ccc',
          fontSize: '10px',
        }}
      />,
    ) as HTMLButtonElement

    expect(el.nodeName).toEqual('BUTTON')
    expect(el.style.border).toBe('1px solid #ccc')
    expect(el.style.fontSize).toBe('10px')
  })

  it('can render boolean attributes', () => {
    const el: HTMLButtonElement = render(<button label="button" type="button" disabled={false} />) as HTMLButtonElement

    expect(el.nodeName).toEqual('BUTTON')
    expect(el.disabled).toBe(false)
  })

  it('can render boolean attributes positively', () => {
    const el: HTMLButtonElement = render(<button label="button" type="button" disabled />) as HTMLButtonElement
    expect(el.nodeName).toEqual('BUTTON')
    expect(el.disabled).toBe(true)
  })

  it('can render boolean attributes implicitly', () => {
    const el: HTMLButtonElement = render(<button label="button" type="button" disabled />) as HTMLButtonElement
    expect(el.nodeName).toEqual('BUTTON')
    expect(el.disabled).toBe(true)
  })

  it('calls the onMount lifecycle hook when a DOM element has been rendered in <body>', () => {
    const someDivRef = createRef()

    const onMount = vi.fn(() => {
      // callback
    })

    render([
      <div ref={someDivRef} onMount={onMount}>
        A
      </div>,
      <div>B</div>,
    ])

    expect(onMount.mock.calls.length).toEqual(1)
  })

  it('calls the onMount lifecycle hook when a DOM element has been rendered in to another <div>', () => {
    const someParentDivRef = createRef()
    const someDivRef = createRef()

    const onMount = vi.fn(() => {
      // callback
    })

    render([<div ref={someParentDivRef}>1</div>, <div>2</div>])

    render(
      [
        <div onMount={onMount} ref={someDivRef}>
          A
        </div>,
        <div>B</div>,
      ],
      someParentDivRef.current!,
    )

    expect(onMount.mock.calls.length).toEqual(1)
  })

  /*
  it('calls the ref callback function when a component is created', () => {
    let someParentDivRef: Element | null = null
    const someDivRef: Ref = {}

    const onMount = vi.fn(() => {
      // callback
    })

    render([
      <div
        ref={(el) => {
          someParentDivRef = el
        }}
      >
        1
      </div>,
      <div>2</div>,
    ])

    render(
      [
        <div onMount={onMount} ref={someDivRef}>
          A
        </div>,
        <div>B</div>,
      ],
      someParentDivRef!,
    )

    expect(onMount.mock.calls.length).toEqual(1)
  })
  */

  it('can forwardRef', () => {
    const TryForwardRef = ({ ref }: Props) => (
      <div>
        <span ref={ref} id="forwardedRef" />
      </div>
    )

    const forwardedRef = createRef<Element>()

    render(<TryForwardRef ref={forwardedRef} />)

    expect(forwardedRef.current!.nodeName).toEqual('SPAN')
    expect(forwardedRef.current!.id).toEqual('forwardedRef')
  })

  it('can use functional component inner update function', () => {
    const newState = { foo: 1234 }
    const innerUpdateFn = vi.fn()

    const TryForwardRef = ({ ref }: Props) => {
      const containerRef = createRef<HTMLElement>()

      if (ref) {
        ref.subscribe!((state: any) => {
          innerUpdateFn(state)
          expect(containerRef.current!.nodeName).toEqual('DIV')
          expect(state).toEqual(newState)
        }) 
      }
      return <div ref={containerRef} />
    }

    const forwardedRef = createRef()

    render(<TryForwardRef ref={forwardedRef} />)

    forwardedRef.update!(newState)

    expect(innerUpdateFn.mock.calls.length).toEqual(1)
  })
})

describe('getRenderer', () => {
  it('hasElNamespace should return true if the namespaceURI of the element matches the SVG namespace', () => {
    const renderer = getRenderer(document)
    const mockElement = {
      namespaceURI: 'http://www.w3.org/2000/svg',
    }
    const result = renderer.hasElNamespace(mockElement as Element)
    expect(result).toBe(true)
  })

  it('hasElNamespace should return false if the namespaceURI of the element does not match the SVG namespace', () => {
    const renderer = getRenderer(document)
    const mockElement = {
      namespaceURI: 'not-the-svg-namespace',
    }
    const result = renderer.hasElNamespace(mockElement as Element)
    expect(result).toBe(false)
  })

  it('hasSvgNamespace should return true if the element has the SVG namespace and type is not "STYLE" or "SCRIPT"', () => {
    const renderer = getRenderer(document)
    const mockParentElement = {
      namespaceURI: 'http://www.w3.org/2000/svg',
    }
    const result = renderer.hasSvgNamespace(mockParentElement as Element, 'SOME_TYPE')
    expect(result).toBe(true)
  })

  it('hasSvgNamespace should return false if the element does not have the SVG namespace', () => {
    const mockDocument = document
    const renderer = getRenderer(mockDocument)
    const mockParentElement = {
      namespaceURI: 'not-the-svg-namespace',
    }
    const result = renderer.hasSvgNamespace(mockParentElement as Element, 'SOME_TYPE')
    expect(result).toBe(false)
  })

  const renderer = getRenderer(document)

  describe('hasElNamespace', () => {
    it('returns true if the domElement has the namespace URI of SVG', () => {
      const mockDomElement = { namespaceURI: SVG_NAMESPACE }
      const result = renderer.hasElNamespace(mockDomElement as Element)
      expect(result).toBe(true)
    })

    it('returns false if the domElement does not have the namespace URI of SVG', () => {
      const mockDomElement = { namespaceURI: 'some-namespace' }
      const result = renderer.hasElNamespace(mockDomElement as Element)
      expect(result).toBe(false)
    })
  })

  describe('hasSvgNamespace', () => {
    it('returns true if the parentElement has the namespace URI of SVG and type is not STYLE or SCRIPT', () => {
      const mockParentElement = { namespaceURI: SVG_NAMESPACE }
      const result = renderer.hasSvgNamespace(mockParentElement as Element, 'SOME_TYPE')
      expect(result).toBe(true)
    })

    it('returns false if the parentElement does not have the namespace URI of SVG', () => {
      const mockParentElement = { namespaceURI: 'some-namespace' }
      const result = renderer.hasSvgNamespace(mockParentElement as Element, 'SOME_TYPE')
      expect(result).toBe(false)
    })

    it('returns false if the type is STYLE', () => {
      const mockParentElement = { namespaceURI: SVG_NAMESPACE }
      const result = renderer.hasSvgNamespace(mockParentElement as Element, 'STYLE')
      expect(result).toBe(false)
    })

    it('returns false if the type is SCRIPT', () => {
      const mockParentElement = { namespaceURI: SVG_NAMESPACE }
      const result = renderer.hasSvgNamespace(mockParentElement as Element, 'SCRIPT')
      expect(result).toBe(false)
    })
  })

  describe('createElementOrElements', () => {
    it('returns an array of child elements if virtualNode is an array', () => {
      const mockVirtualNode = [
        { type: 'div', attributes: {}, children: [] },
        { type: 'span', attributes: {}, children: [] },
      ]
      const result = renderer.createElementOrElements(mockVirtualNode) as Array<Element>
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
    })

    it('returns a single element if virtualNode is an object', () => {
      const mockVirtualNode = { type: 'div', attributes: {}, children: [] }
      const result = renderer.createElementOrElements(mockVirtualNode)
      expect(Array.isArray(result)).toBe(false)
    })

    it('creates an array of elements when passed an array of virtual nodes', () => {
      const virtualNode = [
        { type: 'div', attributes: { id: 'first-div' } },
        { type: 'div', attributes: { id: 'second-div' } },
      ]
      const parentDomElement = document.createElement('div')

      const result = getRenderer(document).createElementOrElements(virtualNode, parentDomElement) as Array<Element>
      expect(result).toHaveLength(2)
      expect(result[0].tagName).toBe('DIV')
      expect(result[1].tagName).toBe('DIV')
    })

    it('creates an element when passed a virtual node', () => {
      const virtualNode = { type: 'div', attributes: { id: 'first-div' } }
      const parentDomElement = document.createElement('div')

      const result = getRenderer(document).createElementOrElements(virtualNode, parentDomElement) as Element
      expect(result.tagName).toBe('DIV')
    })

    it('creates a text node when passed undefined', () => {
      const virtualNode = undefined
      const parentDomElement = document.createElement('div')

      const result = getRenderer(document).createElementOrElements(virtualNode, parentDomElement) as Text
      expect(result.nodeType).toBe(3)
      expect(result.nodeValue).toBe('')
    })
  })

  describe('createElement', () => {
    let virtualNode: VNode
    let parentDomElement: Element

    beforeEach(() => {
      virtualNode = {
        type: 'div',
        attributes: {
          class: 'container',
        },
        children: [
          {
            type: 'p',
            attributes: {},
            children: [],
          },
        ],
      }
      parentDomElement = document.createElement('div')
    })

    it('should create a new DOM element with the correct type and attributes', () => {
      const newEl = renderer.createElement(virtualNode, parentDomElement) as Element

      expect(newEl).toBeDefined()
      expect(newEl.tagName).toEqual('DIV')
      expect(newEl.classList.contains('container')).toBeTruthy()
    })

    it('should create a new SVGElement when the virtual node type is SVG', () => {
      virtualNode.type = 'svg'

      const newEl = renderer.createElement(virtualNode, parentDomElement) as Element

      expect(newEl).toBeDefined()
      expect(newEl.tagName).toEqual('svg')
    })

    it('should create a new SVGElement when the parent DOM element has the SVG namespace', () => {
      virtualNode.type = 'circle'
      parentDomElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

      const newEl = renderer.createElement(virtualNode, parentDomElement) as Element

      expect(newEl).toBeDefined()
      expect(newEl.tagName).toEqual('circle')
    })

    it('should append the new element to the parent DOM element', () => {
      const newEl = renderer.createElement(virtualNode, parentDomElement)

      expect(parentDomElement.children.length).toEqual(1)
      expect(parentDomElement.children[0]).toEqual(newEl)
    })

    it('renders when no attributes are set', () => {
      virtualNode.attributes = {}

      const el = renderer.createElement(virtualNode, parentDomElement)

      expect(el).toBeDefined()
    })

    it('renders a text node without a parent', () => {
      const n = renderer.createTextNode('')

      expect(n).toBeDefined()
      expect(n.nodeName).toEqual('#text')
    })
  })
})

describe('customElements support', () => {
  it('can render webcomponents', () => {
    const rendered = render(
      <p>
        {/** @ts-ignore */}
        <my-paragraph></my-paragraph>
      </p>,
    ) as Element

    expect(rendered.childNodes[0].nodeName).toEqual('MY-PARAGRAPH')
  })
})

describe('readme', () => {
  it('renders what the docs say', () => {
    // HTMLParagraphElement
    const dom: Node = render(<p>Some paragraph</p>) as Element

    // <p xmlns="http://www.w3.org/1999/xhtml">Some paragraph</p>
    const html: string = renderToString(dom)

    expect(html).toEqual('<p xmlns="http://www.w3.org/1999/xhtml">Some paragraph</p>')
  })

  it('whole doc', () => {
    // HTMLElement
    const dom: Node = render(
      <html lang="en">
        <head></head>
        <body></body>
      </html>,
    ) as Element

    // <html xmlns="http://www.w3.org/1999/xhtml"><head></head><body></body></html>
    const html: string = renderToString(dom)
    expect(html).toEqual('<html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head></head><body></body></html>')
  })
}) 

describe('dangerouslySetInnerHTML', () => {
  it('renders elements with innerHTML and no dangerouslySetInnerHTML attribute', () => {
    // Initial empty parent DOM element
    const parentDOMElement: Element = render(
      <div></div>,
    ) as Element
      
    const innerHtmlContent = '<span>Rendered Content</span>'
    const FC = () => <div dangerouslySetInnerHTML={{ __html: innerHtmlContent }}></div>

    const someFc = <FC />
    render(someFc, parentDOMElement)
    
    // Check that the rendered node is a DIV and has the expected innerHTML content
    expect(parentDOMElement.innerHTML).toEqual(`<div>${innerHtmlContent}</div>`)
 
    // Verify that dangerouslySetInnerHTML is not an attribute on the final DOM element
    expect(parentDOMElement.querySelector('div')!.hasAttribute('dangerouslySetInnerHTML')).toBe(false)
  }) 
});