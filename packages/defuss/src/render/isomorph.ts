import type { Dequery } from '../dequery/types.js'
import type { VNodeChild, VNodeChildren, VNode, VNodeType, Ref, VNodeAttributes, DomAbstractionImpl, Globals } from './types.js'

const CLASS_ATTRIBUTE_NAME = 'class'
const XLINK_ATTRIBUTE_NAME = 'xlink'
const XMLNS_ATTRIBUTE_NAME = 'xmlns'
const REF_ATTRIBUTE_NAME = 'ref'

const nsMap = {
  [XMLNS_ATTRIBUTE_NAME]: 'http://www.w3.org/2000/xmlns/',
  [XLINK_ATTRIBUTE_NAME]: 'http://www.w3.org/1999/xlink',
  svg: 'http://www.w3.org/2000/svg',
}

// If a JSX comment is written, it looks like: { /* this */ }
// Therefore, it turns into: {}, which is detected here
const isJSXComment = (node: VNode): boolean =>
  /* v8 ignore next */
  node && typeof node === 'object' && !node.attributes && !node.type && !node.children

// Filters comments and undefines like: ['a', 'b', false, {}] to: ['a', 'b', false]
const filterComments = (children: Array<VNode> | Array<VNodeChild>) =>
  children.filter((child: VNodeChild) => !isJSXComment(child as VNode))

const onUpdateFn = function (this: Ref, callback: Function) {
  this.update = callback as any
}

export const jsx = (
  // if it is a function, it is a component
  type: VNodeType | Function | any,
  attributes: (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>) | null,
  ...children: Array<VNodeChildren> | VNodeChildren
): Array<VNode> | VNode => {
  children = filterComments(
    // Implementation to flatten virtual node children structures like:
    // [<p>1</p>, [<p>2</p>,<p>3</p>]] to: [<p>1</p>,<p>2</p>,<p>3</p>]
    ([] as Array<VNodeChildren>).concat.apply([], children as any) as Array<VNodeChildren>,
  )

  // clone attributes as well
  attributes = { ...attributes }

  // effectively unwrap by directly returning the children
  if (type === 'fragment') {
    return filterComments(children) as Array<VNode>
  }

  // it's a component, divide and conquer children
  if (typeof type === 'function') {
    if (attributes.ref) {
      // references an onUpdate assignment function to be called inside of the functional component
      // to register an "update" function that can be called from the outside (ref.current.update(state?))
      ;(attributes.ref as Ref)!.onUpdate = onUpdateFn.bind(attributes.ref as Ref) as any
    }

    return type({
      children,
      ...attributes,
    })
  }

  // @ts-ignore as type allows for Function here, but internally we wouldn't
  // want to deal with Function, only "string". However, in this method it is indeed possible
  return {
    type,
    attributes: attributes as any,
    children,
  }
}

export const getRenderer = (document: Document): DomAbstractionImpl => {
  // DOM abstraction layer for manipulation
  const renderer = {
    hasElNamespace: (domElement: Element | Document): boolean => (domElement as Element).namespaceURI === nsMap.svg,

    hasSvgNamespace: (parentElement: Element | Document, type: string): boolean =>
      renderer.hasElNamespace(parentElement) && type !== 'STYLE' && type !== 'SCRIPT',

    createElementOrElements: (
      virtualNode: VNode | undefined | Array<VNode | undefined | string>,
      parentDomElement?: Element | Document,
    ): Array<Element | Text | undefined> | Element | Text | undefined => {
      if (Array.isArray(virtualNode)) {
        return renderer.createChildElements(virtualNode, parentDomElement)
      }
      if (typeof virtualNode !== 'undefined') {
        return renderer.createElement(virtualNode, parentDomElement)
      }
      // undefined virtualNode -> e.g. when a tsx variable is used in markup which is undefined
      return renderer.createTextNode('', parentDomElement)
    },

    createElement: (virtualNode: VNode, parentDomElement?: Element | Document): Element | undefined => {
      let newEl: Element

      if (
        virtualNode.type.toUpperCase() === 'SVG' ||
        (parentDomElement && renderer.hasSvgNamespace(parentDomElement, virtualNode.type.toUpperCase()))
      ) {
        newEl = document.createElementNS(nsMap.svg, virtualNode.type as string)
      } else {
        newEl = document.createElement(virtualNode.type as string)
      }

      if (virtualNode.attributes) {
        // dangerouslySetInnerHTML={{ __html: '<... />' }}
        if ('dangerouslySetInnerHTML' in virtualNode.attributes) {
          newEl.innerHTML = virtualNode.attributes.dangerouslySetInnerHTML?.__html
          delete virtualNode.attributes.dangerouslySetInnerHTML 
        }
        renderer.setAttributes(virtualNode.attributes, newEl as Element)
      }

      if (virtualNode.children) {
        renderer.createChildElements(virtualNode.children, newEl as Element)
      }

      if (parentDomElement) {
        parentDomElement.appendChild(newEl)

        // check for a lifecycle "onMount" hook and call it
        if (typeof (newEl as any).$onMount === 'function') {
          ;(newEl as any).$onMount!()
        }
      }
      return newEl as Element
    },

    createTextNode: (text: string, domElement?: Element | Document): Text => {
      const node = document.createTextNode(text.toString())

      if (domElement) {
        domElement.appendChild(node)
      }
      return node
    },

    createChildElements: (
      virtualChildren: VNodeChildren,
      domElement?: Element | Document,
    ): Array<Element | Text | undefined> => {
      const children: Array<Element | Text | undefined> = []

      for (let i = 0; i < virtualChildren.length; i++) {
        const virtualChild = virtualChildren[i]
        if (virtualChild === null || (typeof virtualChild !== 'object' && typeof virtualChild !== 'function')) {
          children.push(
            renderer.createTextNode(
              (typeof virtualChild === 'undefined' || virtualChild === null ? '' : virtualChild!).toString(),
              domElement,
            ),
          )
        } else {
          children.push(renderer.createElement(virtualChild as VNode, domElement))
        }
      }
      return children
    },

    setAttribute: (name: string, value: any, domElement: Element) => {
      // attributes not set (undefined) are ignored; use null value to reset an attributes state
      if (typeof value === 'undefined') return

      // save ref as { current: DOMElement } in ref object
      // allows for ref={someRef}
      if (name === REF_ATTRIBUTE_NAME && typeof value !== 'function') {
        value.current = domElement
      } else if (name === REF_ATTRIBUTE_NAME && typeof value === 'function') {
        // allow for functional ref's like: render(<div ref={(el) => console.log('got el', el)} />)
        value(domElement)
      }

      if (name.startsWith('on') && typeof value === 'function') {
        let eventName = name.substring(2).toLowerCase()
        const capturePos = eventName.indexOf('capture')
        const doCapture = capturePos > -1

        if (eventName === 'mount') {
          ;(domElement as any).$onMount = value
        }

        // onClickCapture={...} support
        if (doCapture) {
          eventName = eventName.substring(0, capturePos)
        }
        domElement.addEventListener(eventName, value, doCapture)
        return
      }

      // transforms className="..." -> class="..."
      // allows for React TSX to work seamlessly
      if (name === 'className') {
        name = CLASS_ATTRIBUTE_NAME
      }

      // transforms class={['a', 'b']} into class="a b"
      if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
        value = value.join(' ')
      }

      const nsEndIndex = name.match(/[A-Z]/)?.index
      if (renderer.hasElNamespace(domElement) && nsEndIndex) {
        const ns = name.substring(0, nsEndIndex).toLowerCase()
        const attrName = name.substring(nsEndIndex, name.length).toLowerCase()
        const namespace = nsMap[ns as keyof typeof nsMap] || null
        domElement.setAttributeNS(
          namespace,
          ns === XLINK_ATTRIBUTE_NAME || ns === 'xmlns' ? `${ns}:${attrName}` : name,
          value,
        )
      } else if (name === 'style' && typeof value !== 'string') {
        const propNames = Object.keys(value)

        // allows for style={{ margin: 10 }} etc.
        for (let i = 0; i < propNames.length; i++) {
          ;(domElement as HTMLElement).style[propNames[i] as any] = value[propNames[i]]
        }
      } else if (typeof value === 'boolean') {
        // for cases like <button checked={false} />
        ;(domElement as any)[name] = value
      } else {
        // for any other case
        domElement.setAttribute(name, value)
      }
    },

    setAttributes: (attributes: VNodeAttributes, domElement: Element) => {
      const attrNames = Object.keys(attributes)
      for (let i = 0; i < attrNames.length; i++) {
        renderer.setAttribute(attrNames[i], attributes[attrNames[i]], domElement)
      }
    },
  }
  return renderer
}

export const renderIsomorphic = (
  virtualNode: VNode | undefined | string | Array<VNode | undefined | string>,
  parentDomElement: Element | Document | Dequery | undefined,
  globals: Globals,
): Array<Element | Text | undefined> | Element | Text | undefined => {

  const parentEl = (parentDomElement as Dequery).el as Element || parentDomElement

  if (typeof virtualNode === 'string') {
    return getRenderer(globals.window.document).createTextNode(virtualNode, parentEl)
  }
  return getRenderer(globals.window.document).createElementOrElements(virtualNode, parentEl)
}

export const Fragment = (props: VNode) => props.children
