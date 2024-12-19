/**
 * Compares two DOM nodes for equality with performance optimizations.
 * 1. Checks for reference equality.
 * 2. Compares node types.
 * 3. For Element nodes, compares tag names and attributes.
 * 4. For Text nodes, compares text content.
 */
export const areDomNodesEqual = (oldNode: Node, newNode: Node): boolean => {
  // return true if both references are identical
  if (oldNode === newNode) return true;

  // compare node types
  if (oldNode.nodeType !== newNode.nodeType) return false;

  // handle Element nodes
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldElement = oldNode as Element;
    const newElement = newNode as Element;

    // compare tag names
    if (oldElement.tagName !== newElement.tagName) return false;

    const oldAttrs = oldElement.attributes;
    const newAttrs = newElement.attributes;

    // compare number of attributes
    if (oldAttrs.length !== newAttrs.length) return false;

    // iterate and compare each attribute's name and value
    for (let i = 0; i < oldAttrs.length; i++) {
      const oldAttr = oldAttrs[i];
      const newAttrValue = newElement.getAttribute(oldAttr.name);
      if (oldAttr.value !== newAttrValue) return false;
    }
  }

  // handle Text nodes
  if (oldNode.nodeType === Node.TEXT_NODE) {
    if (oldNode.textContent !== newNode.textContent) return false;
  }
  return true;
}

// Recursively updates the old node with the new node's contents
const updateNode = (oldNode: Node, newNode: Node)  => {
  if (!areDomNodesEqual(oldNode, newNode)) {
      // nodes are not equal; replace old node with new node
      oldNode.parentNode?.replaceChild(newNode.cloneNode(true), oldNode);
      return;
  }

  // if nodes are equal and are element nodes, recurse on children
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldChildren = oldNode.childNodes;
    const newChildren = newNode.childNodes;
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      if (oldChild && newChild) {
        // both old and new child exist; recurse
        updateNode(oldChild, newChild);
      } else if (newChild && !oldChild) {
        // new child exists but old child doesn't; append it
        oldNode.appendChild(newChild.cloneNode(true));
      } else if (oldChild && !newChild) {
        // old child exists but new child doesn't; remove it
        oldNode.removeChild(oldChild);
      }
    }
  }
}

// partially updates a DOM sub-tree by comparing the sub-tree of a DOM element with new, desired innerHTML
export const updateDom = (targetElement: Element, newInnerHtml: string): void => {
  // parse the new HTML and construct a temporary container for comparison
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = newInnerHtml;

  const newRoots = Array.from(tempContainer.children);

  if (newRoots.length === 0) {
    console.warn('No root elements found in the new HTML.');
    return;
  }

  // iterate over each new root element
  for (let index = 0; index < newRoots.length; index++) {
    const newRoot = newRoots[index];
    const targetChild = targetElement.children[index];
    if (targetChild) {
      updateNode(targetChild, newRoot);
    } else {
      // append new root if target has fewer children
      targetElement.appendChild(newRoot.cloneNode(true));
    }
  }

  // remove any extra children in targetElement
  while (targetElement.children.length > newRoots.length) {
    targetElement.removeChild(targetElement.lastChild!);
  }
}
