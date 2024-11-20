import { parseHTML } from 'linkedom'
import { renderIsomorphic } from './isomorph.js'
import type { RenderInput, RenderResult, Globals } from './types.js'
import type { Dequery } from '../dequery/types.js'

export interface RenderOptions {
  /** choose an arbitrary server-side DOM / Document implementation; this library defaults to 'linkedom'; default: undefined */
  browserGlobals?: Globals

  /** creates a synthetic <html> root element in case you want to render in isolation; default: false; also happens when parentDomElement isn't present */
  createRoot?: boolean
}

export const render = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement?: Element | Dequery,
  options: RenderOptions = {},
): RenderResult<T> => {
  const browserGlobals = options.browserGlobals ? options.browserGlobals : getBrowserGlobals()
  const document = getDocument(options.createRoot, browserGlobals)

  if (!parentDomElement) {
    parentDomElement = createRoot(document)
  }
  return renderIsomorphic(virtualNode, parentDomElement, browserGlobals) as any
}

export const createRoot = (document: Document): Element => {
  const htmlElement = document.createElement('html')
  document.appendChild(htmlElement)
  return document.documentElement
}

export const getBrowserGlobals = (initialHtml?: string): Globals => parseHTML(initialHtml || '')

export const getDocument = (shouldCreateRoot = false, browserGlobals?: Globals): Document => {
  const document = (browserGlobals || getBrowserGlobals()).document
  if (shouldCreateRoot) {
    createRoot(document)
    return document
  }
  return document
}

export const renderToString = (el: Node) => el.toString()

export * from './index.js'
