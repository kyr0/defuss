import type { Dequery } from '@/dequery/types.js'
import { createErrorBoundaryCallback, notifyErrorOccurred, notifyMounted, notifyOnUnmount, onElementUnmount } from '@/render/lifecycle.js'
import type { VNodeChild, VNodeChildren, VNode, VNodeType, VNodeAttributes, DomAbstractionImpl, Globals } from '@/render/types.js'

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


export const jsx = (
  type: VNodeType | Function | any,
  attributes: (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>) | null,
  key?: string,
): Array<VNode> | VNode => {

  // clone attributes as well
  attributes = { ...attributes, key /* key passed for instance-based lifecycle event listener registration */ }

  // extract children from attributes and ensure it's always an array
  let children: Array<VNodeChild> = (attributes?.children ? [].concat(attributes.children) : []).filter(Boolean);
  delete attributes?.children;

  children = filterComments(
    // Implementation to flatten virtual node children structures like:
    // [<p>1</p>, [<p>2</p>,<p>3</p>]] to: [<p>1</p>,<p>2</p>,<p>3</p>]
    ([] as Array<VNodeChildren>).concat.apply([], children as any) as Array<VNodeChildren>,
  )

  // effectively unwrap by directly returning the children
  if (type === 'fragment') {
    return filterComments(children) as Array<VNode>;
  }

  // it's a component, divide and conquer children
  // in case of async functions, we just pass them through
  if (typeof type === 'function' && type.constructor.name !== 'AsyncFunction') {

    try {

      const vdom: VNode = type({
        children,
        ...attributes,
      })

      // store the function reference for error tracking (error boundary scoping)
      if (vdom && typeof type === 'function') {
        vdom.$$type = type
      }

      // ensure to store the key for instance-based lifecycle event listener registration
      if (vdom?.attributes && typeof key === "string") {
        vdom.attributes.key = key
      }
      return vdom;
    } catch (error) {

      if (typeof error === "string") {
				error = `[JsxError] in ${type.name}: ${error}`;
			} else if (error instanceof Error) {
				error.message = `[JsxError] in ${type.name}: ${error.message}`;
			}

      // specific, instance-bound error handling
      if (key) {
        notifyErrorOccurred(error, key)
      }

      // global error handling
      notifyErrorOccurred(error, type)
    }
  }

  return {
    type,
    attributes,
    children,
  };
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

      // if a synchronous function is still a function, VDOM has obviously not resolved, probably an 
      // Error occurred while generating the VDOM (in JSX runtime)
      if (
        virtualNode.constructor.name === 'AsyncFunction'
      ) {
        newEl = document.createElement('div')
        // @ts-ignore: assigning the async function reference for CSR debugging purposes
        newEl.$$asyncType = virtualNode
      } else if (typeof virtualNode.type === 'function') {
        newEl = document.createElement('div')
        ;(newEl as HTMLElement).innerText = `FATAL ERROR: ${virtualNode.type._error}`
      } else if (
        virtualNode.type.toUpperCase() === 'SVG' ||
        (parentDomElement && renderer.hasSvgNamespace(parentDomElement, virtualNode.type.toUpperCase()))
      ) {
        newEl = document.createElementNS(nsMap.svg, virtualNode.type as string)
      } else {
        newEl = document.createElement(virtualNode.type as string)
      }

      if (virtualNode.attributes) {        
        renderer.setAttributes(virtualNode, newEl as Element)

        // Apply dangerouslySetInnerHTML if provided
        if (virtualNode.attributes.dangerouslySetInnerHTML) {
          // TODO: FIX me
          newEl.innerHTML = virtualNode.attributes.dangerouslySetInnerHTML.__html;
        }
      }

      if (virtualNode.children) {
        renderer.createChildElements(virtualNode.children, newEl as Element)
      }

      if (parentDomElement) {
        parentDomElement.appendChild(newEl)

        // --- element lifecycle --

        // check for a lifecycle "onMount" hook and call it
        if (typeof (newEl as any).$onMount === 'function') {
          ;(newEl as any).$onMount!()
          // remove the hook after it's been called
          ;(newEl as any).$onMount = null; 
        }

        // optionally check for a element lifecycle "onUnmount" and hook it up
        if (typeof (newEl as any).$onUnmount === 'function') {
          // register the unmount observer (MutationObserver)
          onElementUnmount(newEl as HTMLElement, (newEl as any).$onUnmount!)
        }

        // --- components lifecycle, instance or global index based ---

        // --- components lifecycle ---

        if (virtualNode.attributes.key) {
          console.log("lifecycleListenerIndex (hydrate) instance-bound", virtualNode.attributes.key)
          
          // notify mounted
          notifyMounted(newEl as HTMLElement, virtualNode.attributes.key)

          // register the unmount observer (MutationObserver)
          notifyOnUnmount(newEl as HTMLElement, virtualNode.attributes.key)
        }

        if (virtualNode.$$type) {
          console.log("lifecycleListenerIndex (hydrate) global", virtualNode.$$type)
          
          // notify mounted
          notifyMounted(newEl as HTMLElement, virtualNode.$$type)

          // register the unmount observer (MutationObserver)
          notifyOnUnmount(newEl as HTMLElement, virtualNode.$$type)
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

    setAttribute: (name: string, value: any, domElement: Element, virtualNode: VNode<VNodeAttributes>) => {
      // attributes not set (undefined) are ignored; use null value to reset an attributes state
      if (typeof value === 'undefined') return // if not set, ignore
      if (name === 'dangerouslySetInnerHTML') return; // special case, handled elsewhere
      if (name === 'key') return; // ignore key attribute (internal use only)

      // save ref as { current: DOMElement } in ref object
      // allows for ref={someRef}
      if (name === REF_ATTRIBUTE_NAME && typeof value !== 'function') {
        value.current = domElement
      }

      if (name.startsWith('on') && typeof value === 'function') {

        let eventName = name.substring(2).toLowerCase()
        const capturePos = eventName.indexOf('capture')
        const doCapture = capturePos > -1

        if (eventName === 'mount') {
          ;(domElement as any).$onMount = value // lifecycle hook
        }

        if (eventName === 'unmount') {
          ;(domElement as any).$onUnmount = value // lifecycle hook
        }

        // onClickCapture={...} support
        if (doCapture) {
          eventName = eventName.substring(0, capturePos)
        }
        domElement.addEventListener(eventName, createErrorBoundaryCallback(value, virtualNode.$$type, virtualNode.attributes.key).bind(domElement), doCapture)
        return
      }

      // transforms className="..." -> class="..."
      // allows for React JSX to work seamlessly
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

    setAttributes: (virtualNode: VNode<VNodeAttributes>, domElement: Element) => {
      const attrNames = Object.keys(virtualNode.attributes)
      for (let i = 0; i < attrNames.length; i++) {
        renderer.setAttribute(attrNames[i], virtualNode.attributes[attrNames[i]], domElement, virtualNode)
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
  let renderResult: Array<Element | Text | undefined> | Element | Text | undefined

  if (typeof virtualNode === 'string') {
    renderResult = getRenderer(globals.window.document).createTextNode(virtualNode, parentEl)
  } else {
    renderResult = getRenderer(globals.window.document).createElementOrElements(virtualNode, parentEl)
  }
  return renderResult;
}

// --- JSX standard (necessary exports for jsx-runtime)
export const Fragment = (props: VNode) => props.children
export const jsxs = jsx
export const jsxDEV = jsx

export default {
  jsx,
  Fragment,
  renderIsomorphic,
  getRenderer,

  // implementing the full standard
  // https://github.com/reactjs/rfcs/blob/createlement-rfc/text/0000-create-element-changes.md
  jsxs,
  jsxDEV,
};