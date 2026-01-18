import {
  DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE,
  hydrate,
  type Props,
  type Ref,
  REF_ATTRIBUTE_NAME,
  renderSync,
} from "defuss/client";
import { StaticHtml } from "./render.js";

export default (element: HTMLElement) =>
  async (
    Component: any,
    props: Record<string, any>,
    { default: children, ...slotted }: Record<string, any>,
    { client }: Record<string, string>,
  ) => {
    const isHydrate =
      element.hasAttribute("ssr") &&
      (client === "visible" ||
        client === "idle" ||
        client === "load" ||
        client === "media");

    if (!element.hasAttribute("ssr")) return;

    // <slot> mechanics
    Object.entries(slotted).forEach(([key, value]) => {
      props[key] = StaticHtml(value);
    });

    // traverse the props object and create a new object with the same values
    const componentProps: Props = {
      ...props,
      // set hydration key to the component name by default, if not already set
      key: props.key || Component.name,
    };

    // children is a special prop that contains the children of the component
    if (children) {
      // all children are passed as an array
      if (!Array.isArray(children)) {
        children = [children];
      }

      for (let i = 0; i < children.length; i++) {
        if (typeof children[i] === "string") {
          // turn static HTML into a component
          children[i] = StaticHtml(children[i]);
        }
      }
      componentProps.children = children;
    }

    if (isHydrate) {
      //console.log('hydrate! name', Component.name, Component, 'props', props, 'slotted', slotted, 'children', children, 'client', client);

      // just call the function tree, but do not render;
      // implementing hydration is atomic and the responsibility of each respective component

      // TODO: try/catch and do not hydrate if it fails?
      let roots = Component(componentProps);

      if (!Array.isArray(roots)) {
        roots = [roots];
      }

      //console.log("roots", roots)
      //console.log("vs. existing childNodes", Array.from(element.childNodes))

      hydrate(roots, Array.from(element.childNodes));
    } else {
      // remove suspense element
      // TODO: fix me!
      element.innerHTML = "";

      //console.log('client:only', Component, 'props', props, 'slotted', slotted, 'children', children, 'client', client);

      // turn the component AST into an actual DOM element and attach it to the element passed in
      // the Array<> case is, when a component uses a Fragment (<></<>) as the top-level child (root of sub-tree)
      let roots: HTMLElement | Array<HTMLElement> = renderSync(
        Component(componentProps),
        element,
      ) as HTMLElement;

      if (!Array.isArray(roots)) {
        roots = [roots];
      }

      const attrs = {};

      // set all props as top level attributes
      for (const [key, value] of Object.entries(props)) {
        if (key !== "children") {
          (attrs as Record<string, unknown>)[key] = value;
        }
      }

      Object.entries(attrs).forEach(([key, value]) => {
        // TODO: re-use setAttribute() logic from isomorph.js!

        // attributes not set (undefined) are ignored; use null value to reset an attributes state
        if (typeof value === "undefined") return; // if not set, ignore

        if (key === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE) return; // special case, handled elsewhere

        if (key === REF_ATTRIBUTE_NAME && typeof value === "object") {
          // @ts-ignore
          value.current = element; // update ref
          element._defussRef = value! as Ref; // store ref on element for later access
          return; // but do not render the ref as a string [object Object] into the DOM
        }

        element.setAttribute(key, String(value)); // set each attribute on the root element
      });

      element.addEventListener(
        "astro:unmount",
        () => {
          // remove each root from its parent
          roots.forEach((root) => {
            if (root.parentNode) {
              root.parentNode.removeChild(root);
            }
          });
        },
        { once: true },
      );
    }

    element.addEventListener(
      "astro:unmount",
      () => {
        element.innerHTML = ""; // scrub the element subtree
      },
      { once: true },
    );
  };