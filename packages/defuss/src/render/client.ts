import type { Dequery } from '../dequery/types.js'
import { renderIsomorphic } from './isomorph.js'
import type { RenderInput, RenderResult } from './types.js'

export const render = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement: Element | Document | Dequery = document.documentElement,
): RenderResult<T> => renderIsomorphic(virtualNode, parentDomElement, window) as any

export const renderToString = (el: Node) => new XMLSerializer().serializeToString(el)

export * from './index.js'
