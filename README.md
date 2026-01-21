<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

Re-inventing web dev _again_.

</sup>

</h1>

Defuss is a modern, full-featured web framework designed to bring simplicity and determinism back to web dev. Here's what makes it special:

## 🎯 Core philosophy
Defuss follows the principle of "explicit simplicity" - it provides powerful tools while keeping complexity low and giving developers full control. You can read `defuss`-Code top-down. There is no _hidden magic_, like a depedency array that eventually creates a 7.3 Tbps [DDoS attack on Cloudflare](https://www.youtube.com/watch?app=desktop&v=gDVxBOGL99Q). `defuss` code is ideomatic and self-explainatory. 

## Who is `defuss` for?

- Junior developers who want to learn web development without getting overwhelmed (`defuss` uses web standards with _very_ thin abstrctions -> you get to learn the _real_ thing, not some framework-specific APIs)
- Senior developers who are fed up with heisenbugs from complexity, dependency hells and endless abstractions layers
- Teams that prefer explicit over implicit code and want to maintain control over complexity, not layer one complexity on top of another because they basically don't understand what is going on anymore
- Teams focussed on security - favoring minimalism and simplicity for a better security posture
- Projects where bundle size matters
- Developers who enjoy writing JSX, but miss the simplicity of jQuery
- Anyone tired of complexity in general and looking for a framework that respects their intelligence and creativity

 **Defuss** embodies the "original hacker philosophy" - encouraging developers to understand how things work, learn continuously, and build elegant solutions without unnecessary complexity.

```tsx
// we need a few imports from the library (TypeScript-only)
import { type Props, type Ref, $, render, createRef } from "defuss"

// When using TypeScript, interfaces come in handy
// They help with good error messages!
export interface CounterButtonProps extends Props {

  // what the button displays
  label: string;
}

// Component functions are called once! 
// No reactivity means *zero* complexity!
export function CounterButton({ label }: CounterButtonProps) {

  // References the DOM element once it becomes visible.
  // When it's gone, the reference is gone. Easy? Yeah.
  const btnRef: Ref = createRef()

  // A vanilla JavaScript variable. No magic here!
  let clickCounter = 0

  // A native event handler. Called when the user clicks on the button.
  // Receives the native DOMs MouseEvent. No magic here either!
  const updateLabel = (evt: MouseEvent) => {

    // just increment the counter variable on click. Easy? Yeah.
    clickCounter++;

    console.log("updateLabel: Native mouse event", evt)

    // partially and atomically update the DOM with a new VDOM  
    $(btnRef).update(<em>{`Count is: ${clickCounter}`}</em>)
  }

  // When the code builds, this JSX is turned into a virtual DOM (JSON).
  // At runtime, the JSON-based virtual DOM is rendered (SSR or CSR) and eventually displayed.
  // When using the defuss Astro adapter, passing down hydration state is as simple as passing one prop.
  return (
    <button type="button" ref={btnRef} onClick={updateLabel}>
      {/* This label is rendered *once*. It will never change reactively! */}
      {/* Only with *explicit* code, will the content of this <button> change. */}
      {label}
    </button>
  )
}

// whereever you place the Component markup, it is displayed...
render(<CounterButton label="Don't. You. Dare. 👀" />, document.body)
```

No time for long introductions? Here is the best way to learn `defuss`:

0. Get familiar with `defuss` [](https://stackblitz.com/github/kyr0/defuss/tree/main/examples/with-astro-ts?file=src%2Fcomponents%2FApp.tsx) *(~3min)*
1. **Play** with `defuss`' [./examples](examples/) *(~10min)*
2. [`create-defuss`](https://github.com/kyr0/defuss/tree/main/packages/create#-getting-started) **your own** `defuss` + `Astro` or `Vite` project  *(~20min)*
3. Checkout all of other the examples and become a `defuss` intermediate *(~8h)*
4. Work through the **complete codebase** in [./packages](packages/) and become a **`defuss` expert** *(~24h - 3d depending on experience)*
5. Build your **dream product** and **have a lot of fun**!

## 🔧 What defuss really is
Defuss is a tiny, modern web framework that:

- **Eliminates complexity** in modern web development
- Promotes **explicit code** over _hidden magic_
- Brings back the *joy of building* for the web
- Works with **native DOM APIs** and **vanilla JavaScript**
  - (It can be load in a `<script>`-tag to enhance websites, just like jQuery back in the day)
- Provides **React-like JSX components**, without any overhead or boilerplate, but **with** native <code>async</code> rendering
- **No mental load** caused by implicit reactivity 
- Offers a **modern jQuery-like API** for **atomic** DOM manipulation
- Comes with a DOM diff'ing algorithm for efficient UI updates (**no** `innerHTML` or `innerText` usage)
- Supports **TypeScript** out of the box, providing excellent type safety and developer experience (DX)
- Is **fully isomorphic**, working seamlessly in both **browser** and **Node.js** environments
- Integrates with modern build tools like **Vite**, **Astro** and it's own SSG tool **defuss-ssg** for dead-simple static site generation
- **Compatible** with any vanilla TypeScript/JavaScript/WebAssembly library, Web Components-based UI library or CSS framework allowing you to use your favorite tools without any restrictions
- **Official 3rd-party UI framework support**: Explicit support for: **Tailwind**, **Bootstrap**, **Ionic**, **Franken UI (Shadcn, UIkit)**, **Material UI** and our own UI toolkits: **defuss UI**, **Windows XP Desktop UI** and **Squeezy**
- **Batteries included:** Has a rich ecosystem of packages for UI, i18n, client-side state management, RPC (much like Ext.Direct), database abstraction that works with various databases, JWT-keystore, search engine with fulltext and vector index support, typed JSON support, and more.

## ⚡ Key Features
- **No Implicit Reactivity**: Components render once, giving you full control at runtime
- **Tiny Bundle Size**: Core framework is < ~4 KiB compressed
- **Zero Dependencies**: Minimal external dependencies, most are optional dev dependencies or very well maintained foundation packages
- **Isomorphic**: Works in browser and Node.js (SSR, SSG)
- **Modern Tooling**: Integrates with Vite, Astro, `pkgroll`, `esbuild`, and more out-of-the-box
- **TypeScript First**: Built with TypeScript, excellent type support to boost developer experience
- **Security**: Strong focus on security to prevent vulnerabilities, no `innerHTML` or `innerText` usage

## 💡 Why Choose Defuss?

Well, `defuss` is not just another framework. It's really fun and easy to use, but for the CTO you need to convince, here are some key points:

- **Simplicity**: No complex abstractions, no hidden magic, just explicit code
- **Developer Experience**: TypeScript support, modern tooling, and a familiar API's - all designed to make development, debugging and deployment really enjoyable
- **Code Quality and Test Coverage**: High code quality with >90% test coverage overall, ensuring reliability and maintainability
- **Learning Curve**: Familiar JSX syntax (React-like), jQuery-like DOM API
- **Performance**: Tiny bundle size, efficient rendering (when done like in the examples, provides you a 100% score on Lighthouse using `defuss-astro`)
- **Control**: No hidden reactivity, explicit state management
- **Flexibility**: Works with any vanilla JavaScript/TypeScript libraries
- **Modern**: TypeScript, ESM, modern build tools
- **Stable**: Simple API surface that won't break

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code> Island!</b></i>
</p>
