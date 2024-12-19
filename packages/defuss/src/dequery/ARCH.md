# dequery Architecture

The user interface, presented by the browser, is based on a tree-structure
called the DOM (Document Object Model). It consists of objets that represent
document "nodes", such as Text or Elements which can also be interactive, 
like links, forms and input elements. 

When the DOM is only used to present information, the use-cases of dynamic change 
to its strucutre are little. However, nowadays, the user often interacts with the frontend.
This is a major concern in all modern websites, PWAs (websites that run 
as portable web applications on mobile, tablet and desktop, tightly integrated) 
and enterprise business applications.

A framework that solves a frontend rendering problem by creating a DOM and SSR-rendering
it as HTML/CSS, or letting the browser do the rendering work in CSR mode, necessarily has
to solve the problem of how the programmer will be able to attach events to specific nodes
in the DOM tree (e.g. to a button), so that application logic, that is eventually is or becomes
JavaScript, can implement custom interaction logic (e.g. to open a modal).

In order for the programmer to do so, they must be able to get hold of a reference to 
e.g. a button, deep down nested in the DOM tree. There are basically two ways, a frontend
framework can accomplish that:

- **A: Consistent VDOM state and hydration**: The frontend renders the DOM, keeps a simplified
tree-structure as a state, mapping a VDOM node (a simplified virtual DOM object) 1:1 to a 
real, existing DOM node in the browser. This way, the event listener is attached to a DOM 
element either directly in CSR mode, or later in the hydration phase when the DOM is created
natively by the browser after parsing HTML from a string, that has been rendered by the framework 
on the server-side (SSR).

- **B: DOM querying using CSS selectors**: Cascading Stylesheets need to solve a similar search 
problem to finding a DOM element in a tree for attaching user interaction logic: They need to
address a single or multiple DOM elements in a vast tree with many branches and leafs. CSS selectors
were designed to address this problem. You may use a CSS class, an ID, a specific attribute selector,
or a hierachical representation of many of those selectors in combination to uniquely address 
one or many DOM elements. This works on the client- and the server-side as long as the framework
implements the means of a quasi-real DOM API on the server-side, where a real browser isn't available.

Dequery is an API that solves two major problems, programmers might face when working with the
latter approach:

- The DOM query selector API is low-level, tedious, complex and breaks in case of
temporal invariance (when an element is guaranteed to be existing in the very near future (next few nanoseconds), 
but isn't just yet). Traditionally, this led to alot of glue code being written in the early 2000s and the 
invention of the classic JavaScript framework `jQuery` which solved a similar problem. 

- When a DOM elements are selected, programmers often want to mutate them. But 
the DOM API doesn't allow calls to be chained, which leads to unnecessary complexity handling temporary variables.
While this as been addressed by `jQuery` too, replacing a DOM sub-tree  still required writing either vast code 
for selecting specific places in the DOM to only replace content in small chunks. Often, lazy programmers simplified
this by using non-atomic property like `innerHTML` (`.html(newInnerHTML)`) or 
`innerText` (`.text(newInnerText)`). This led to security issues such as XSS (unintentionally accepting `<script>` tags to be
injected), flickering user interfaces when large parts of the DOM are being replaced at once, and side-effects such as that
DOM elements that were referred to by reference in other parts of the code, would suddenly dispose. Because the DOM API
did not provide a way to register lifecycle events such as `onUnmount`, the unpopular `x of undefined` error 
became the unfortunate consequence.

While `defuss/render` addresses **A: Consistent VDOM state and hydration** in a lightweight way, 
`defuss/dequery` is a modern solution that addresses **B: DOM querying using CSS selectors** in a modern way,
providing an API that is similar to the classic and very popular `jQuery`, but taking care for all of its 
deficits.

- The native query selector engine of the DOM API provided is used to select nodes or sets of nodes.
- The temporal invariance issue is addressed by implementing a custom Promise chain and stack automata algorithm. Selectors are awaitable using a DOM `MutationObserver`.
- The API is fully chainable, allowing to spare on intermediate state, complex control flow and temporary variables.
- Mutations allow for both classic DOM manipulation as by the standard, but support and promote using VDOM/JSX-based partial updates.
- When using `defuss/render`, functional components using closure state keep track of DOM references including lifecycle events such as `onMount`/`onUnmount`. When `ref` is used, it updates automatically on partial VDOM updates using `.jsx(newJsxForPartialUpdate)`.
- The most popular jQuery APIs are implemented, leveraging high productivity and a low learning curve for many senior developers.