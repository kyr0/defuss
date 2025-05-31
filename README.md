<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

Simplify & Succeed

</sup>

</h1>

Defuss is a modern, minimalist web framework designed to bring simplicity back to web development. Here's what makes it special:

## 🎯 Core Philosophy
Defuss follows the principle of "explicit simplicity" - it provides powerful tools while keeping complexity low and giving developers full control. The framework motto is "Simplify & Succeed."

## 🔧 What Defuss Is
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
- Integrates with modern build tools like **Vite** and **Astro**
- **Compatible** with any vanilla TypeScript/JavaScript/WebAssembly library, Web Components-based UI library or CSS framework allowing you to use your favorite tools without any restrictions
- **Official 3rd-party UI framework support**: Explicit support for: **Tailwind**, **Bootstrap**, **Ionic**, **Franken UI (shadcn)**, **Material UI** and our own UI toolkits: **Windows XP Desktop UI** and **Squeezy**
- **Batteries included:** Has a rich ecosystem of packages for UI, state management, database access, and more (see below).

## ⚡ Key Features
- **No Implicit Reactivity**: Components render once, giving you full control at runtime
- **Tiny Bundle Size**: Core framework is < ~4 KiB compressed
- **Zero Dependencies**: Minimal external dependencies, most are optional dev dependencies or very well maintained foundation packages (like `happy-dom`, `mongodb`, `dexie`, etc.)
- **Isomorphic**: Works in browser and Node.js (SSR)
- **Modern Tooling**: Integrates with Vite and Astro
- **TypeScript First**: Built with TypeScript, excellent type support to boost developer experience
- **Security**: Strong focus on security to prevent vulnerabilities, no `innerHTML` or `innerText` usage

## 📦 Package Ecosystem

### Core Framework (`defuss`)
- **Isomorphic, bi-directional, asynchronous DOM-diffing JSX Renderer**: Renders JSX to DOM and HTML/SVG back to JSX in just ~520 LoC, **no virtual DOM (VDOM)**. JSX is tuned into JSON at compile time, and rendered/hydrated at runtime. In SSR-mode, HTML is shipped to the client, and the client-side code hydrates the DOM based on the same JSON-based JSX representation, not keeping any other VDOM state in-between (partial) re-rendering. Rendering is truly atomic and asynchronous using `async` and `queueMicrotask`.
- **Dequery**: A powerful, modern take on a jQuery-like API for DOM manipulation (because in *defuss* _YOU_ decide when, what and how to update the DOM in just 1 LoC in contrast to 100s of lines of reactvity-taming code in other frameworks that try to hide the DOM from you)
- **Cache System**: Isomorphic storage (`localStorage`, `sessionStorage`, `memory`)
- **i18n Support**: Internationalization utilities

### Build Tool Integrations
- **`defuss-vite`**: Vite plugin for JSX transpilation and optimization
- **`defuss-astro`**: Astro integration with SSR support and image optimization

### Database Layer (`defuss-db`)
- **Isomorphic Database API**: Works with Dexie (IndexedDB), MongoDB, and LibSQL
- **Simple CRUD Operations**: Unified API across different databases
- **Client/Server Support**: Same code works in browser and Node.js

### UI & Styling
- **`defuss-ui`**: Component library with desktop, mobile, and common components
- **`defuss-squeezy`**: CSS framework with responsive design
- **`defuss-squeezy-reset`**: CSS reset and normalization
- **`defuss-windy`**: Tailwind-compatible utility classes

### Specialized Tools
- **`desktop`**: Dequery extensions Shell and Window Manager for creating fully functional, themed desktop environments in-browser
- **`dson`**: Definitely-typed Serialized Object Notation (preserves original JS types including DOM elements and binary data)
- **`lightningimg`**: WebAssembly-based image optimization
- **`runtime`**: Provides `lodash`-like utilities for common tasks.
- **`transval`**: Runtime type validation with TypeScript support
- **`rpc`**: Type-safe remote procedure calls - runs reflection on server-side classes and generates the same API for client-side calls. This allows you to transparently call server-side functions as if they were implemented on client-side.

### Developer Experience
- **`create-defuss`**: Project scaffolding tool
- **Examples**: Multiple example projects (Astro, Vite, PWA, etc.)

## 🎨 Design Principles
- **Trust the programmer** - Don't hide functionality behind abstractions but still reduce complexity though elegant APIs
- **Don't prevent the programmer** from doing what needs to be done
- **Keep it small and simple** - Minimize bundle size, write concise code using smart algorithms
- **Don't make programmers repeat themselves** - every feature should fulfill one responsibility and be reusable (like a Lego brick)
- **Make it work, make it fast, make it beautiful** - Focus on pragmatism, performance, and elegance; 
  don't over-engineer, rabbit-hole or add unnecessary features 

## 🚀 What You Can Build

Defuss is perfect for:

* **E-commerce sites**
* **Content management systems (CMS)**
* **Enterprise web applications**
* **Dashboards and admin panels**
* **Single Page Applications (SPAs)**
* **Server-side rendered (SSR) applications**
* **Static sites with dynamic features**
* **Hybrid applications (server- and client-side rendering)**
* **Progressive Web Apps (PWAs) / mobile apps**
* **Proof-of-Concepts (POCs) and Minimum Viable Products (MVPs)**
* **Data visualization tools**
* **Interactive web applications and marketing experiences**
* **Real-time applications with WebSockets**
* **AI-driven applications and chatbots**
* **Portfolio websites and blogs**
* **Custom web components and UI libraries/frameworks**
* **WebAssembly applications**
* **Desktop-like applications in the browser**
* **Browser extensions**
* **Browser-based games**
* **Tauri/Electron native desktop apps built with Web Technologies, Node.js or Rust backends**

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

## 🎯 Target Audience
Defuss is ideal for:

- Junior developers who want to learn web development without getting overwhelmed (and learn the fundamentals, not just some framework's API's)
- Senior developers who are fed up with complexity, dependency hells and endless abstractions layers
- Therefore, teams that prefer explicit over implicit behavior and want to maintain control over their codebase
- Teams focussed on security - favoring minimalism and simplicity for a better security posture
- Projects where bundle size matters
- Developers who enjoyed the simplicity of jQuery but want modern features
- Anyone tired of complexity in general and looking for a framework that respects their intelligence and creativity

 **Defuss** embodies the "original hacker philosophy" - encouraging developers to understand how things work, learn continuously, and build elegant solutions without unnecessary complexity.

```tsx
// we need a few imports from the library (TypeScript-only)
import { type Props, type Ref, $, render, createRef } from "defuss"

// When using TypeScript, interfaces come in handy
// They help with good error messages!
export interface CounterProps extends Props {

  // what the button displays
  label: string;
}

// Component functions are called once! 
// No reactivity means *zero* complexity!
export function Counter({ label }: CounterProps) {

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
render(<Counter label="Don't. You. Dare. 👀" />, document.body)
```

No time for long introductions? Here is the best way to learn `defuss`:

0. Get familiar with `defuss` [](https://stackblitz.com/github/kyr0/defuss/tree/main/examples/with-astro-ts?file=src%2Fcomponents%2FApp.tsx) *(~3min)*
1. **Play** with `defuss`' [./examples](examples/) *(~10min)*
2. [`create-defuss`](https://github.com/kyr0/defuss/tree/main/packages/create-defuss#-getting-started) **your own** `defuss` + `Astro` or `Vite` project  *(~20min)*
3. Checkout all of other the examples and become a `defuss` intermediate *(~8h)*
4. Work through the **complete codebase** in [./packages](packages/) and become a **`defuss` expert** *(~24h - 3d depending on experience)*
5. Build your **dream product** and **have a lot of fun**!

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code> Island!</b></i>
</p>