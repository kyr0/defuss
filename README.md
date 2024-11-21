<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

`defuss`

<sup align="center">

Simplify & Succeed

</sup>

</h1>


> `defuss` is a simple, tiny and modern web framework. It stops  **complexity**, promotes **explicit code**, and brings back the **joy** of building for the web! 😊

No time for long introductions? Here is the best way to learn `defuss`:

1. **Play** with `defuss`' [./examples](examples/) *(~5min)*
2. Create **your own** `defuss` + [`Astro`](examples/with-astro-ts) or [`Vite`](examples/with-vite-ts) project *(~5min - 20min)*
3. Read **The `defuss` Book** _(see below)_ && become a `defuss` expert *(~1h - 3h)*
4. Understand the **whole codebase** in [./packages](packages/) and become a **`defuss` core developer** *(~24h - 3d)*
5. Build your **dream product** and **succeed**! *(very soon)*

<h3 align="center">

`defuss` in one picture

</h3>

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>

<h3 align="center">

How does `defuss` work?

</h3>

`defuss` is a tiny, modern web framework that is designed to be <u>extremly</u> simple and puristic. *Learn more about the motivation [here](https://github.com/kyr0/defuss?tab=readme-ov-file#the-defuss-story).*

- You are in full control: There is **no** implicit **reactivity**. 
- No hidden surprises: Every Component is rendered **once**.
- You work with the **native DOM**. 
- All APIs are **stable** and **classic**.
- Nevertheless, all **modern** web features are supported.

```tsx
// we need a few imports from the library (TypeScript-only)
import { type Props, type Ref, $, jsx } from "defuss"

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
  const ref: Ref = {}

  // A vanilla JavaScript variable. No magic here!
  let clickCounter = 0

  // A native event handler. Called when the user clicks on the button.
  // Receives the native DOMs MouseEvent. No magic here either!
  const updateLabel = (evt: MouseEvent) => {

    // just increment the counter variable on click. Easy? Yeah.
    clickCounter++;

    console.log("updateLabel: Native mouse event", evt)

    // Changes the innerText of the <button> element.
    // You could also do: buttonRef.current.innerText = `...`
    // but dequery works like jQuery and is much simpler!
    $(ref).text(`Count is: ${clickCounter}`)
  }

  // Already when your code builds, this JSX is turned into a virtual DOM.
  // At runtime, the virtual DOM is rendered and displayed in the browser.
  // It usually is pre-rendered (SSR) on server-side and hydrated in the browser.
  return (
    <button type="button" ref={ref} onClick={updateLabel}>
      {/* This label is rendered *once*. It will never change reactively! */}
      {/* Only with *explicit* code, will the content of this <button> change. */}
      {label}
    </button>
  )
}

// whereever you place the Component markup, it is displayed...
<Counter label="Don’t. You. Dare. 👀" /> 
```

<h3 align="center">

Using defuss in an existing `Astro` or `Vite` project

</h3>
If you'd like to integrate `defuss` in an existing `Astro` or `Vite` project, you need to install `defuss` manually:

```bash
# install a decent package manager
npm i -g pnpm@^9.13.2

# install the defuss library (in your projects root folder)
pnpm install defuss
```

- To install `defuss`' `Astro` integration manually, head over [here](packages/defuss-astro/README.md).

- To install `defuss`' `Vite` plugin manually, head over [here](packages/defuss-vite/README.md).

<h2 align="center">

The `defuss` Story

</h2>

<h3 align="center">

Complexity is the devil! 👿 *(The Rant!, 5 Mins.)*

</h3>

Modern web engineering has spiraled into a maze of complexity. Endless layers of abstraction in today’s frameworks, ever-shifting APIs, and an explosion of dependencies have turned many projects into unmanageable beasts. The [cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity) of contemporary codebases is often staggering, leaving developers grappling with chaos more often than clarity.

Because modern projects often depend on a myriad of third-party software components, they never fail to "amaze" with yet another breaking change or regression. Just when you think everything is stable — *surprise!* — some dependency update causes your carefully orchestrated logic to collapse. 

And it doesn't stop there. You take a deep breath, open your browser, start debugging, only to discover that, for example, the reactive state has decided to implode and become a corrupt, untraceable mess. No matter how many steps you dig into history, you’re stuck in chaos because someone once thought that *immutability* and *event sourcing* is key, while another believed in *reactivity* as the new holy grail of software engineering. In combination however, a complexity hell is the result.

Breaking changes, regressions, and bizarre bugs are now part of our daily lives as programmers. Popular new patterns, paradigms and libraries, while valuable in the right context, are frequently added without nuance, creating problems they were meant to solve. You suddenly find yourself writing code to tame third-party software behaviour, a linter, or any ideologic code quality metric instead of working on and shipping features of your product.

But it doesn't stop with a blackhole of dependencies. When you're searching the web for "best practices", you're faced with the gospel of pattern orthodoxy: "Loops are bad, use recursion!", "Mutation is the root of all evil.", "No global state ever!". The result? Codebases that are hardly readable and waste resources.

You might also encounter ideological extremes, such as rigid object-oriented dogma. Here, inheritance hierarchies stretch five levels deep, layered with abstract classes, interfaces, and non-inheritable private methods. Making any change feels like untangling a web spun by a particularly vengeful spider.

On the flip side, some codebases adhere strictly to functional programming principles: `write(only(monads(because(everything(else(is(evil())))))))`
While these approaches might sharpen your memory as you juggle return values across long, sometimes recursive call stacks, they are far from optimal.

And beware of those who prioritize cleverness over clarity — they’ll craft intricate, "genius-level" (or so they think) solutions in 20 lines instead of 200. But two months later, even they won’t be able to explain or defend their own code.

Elegant code doesn’t need to swear loyalty to any single paradigm. In fact, true elegance often arises from thoughtfully blending paradigms:

- Use **functional programming** for mathematical algorithms or data transformations.
- Rely on **object-oriented design** to define robust data types and to encapsulate behavior.
- Adopt **procedural programming** for linear workflows or straightforward control flow.
- Opt for **recursion** in tree traversal, but stick to **loops** for simple list iterations.
- Copy memory when serialization or history tracking is required, but don’t shy away from **in-memory mutation** for performance-critical tasks.

The problem isn’t the tools, frameworks or patterns themselves; it’s the blind application of these ideas without understanding their implications. Complexity creeps in when we fail to assess whether a particular approach is the right fit for the job.

Bad code isn’t the result of choosing the “wrong” paradigm. It’s the result of misunderstanding the paradigm — or even worse, the problem you’re trying to solve. No pattern or methodology can save you if you don’t understand your own code.

The path to better software lies in simplifying, not complicating. Write less code. Strip away unnecessary abstraction. When you’ve reduced your solution to its essence, document the *why* behind each line. This clarity brings maintainability and ensures the code remains accessible to future developers — including yourself.

The philosophy I promote here is what I call **neo-pragmatic design**:

- **Neo**: Inspired by foundational principles of simplicity and clarity, championed by pioneers like Dennis Ritchie (co-creator of C and Unix).
- **Pragmatic**: Focused on delivering solutions that meet requirements without unnecessary overhead.
- **Design**: Prioritizing thoughtful, intentional decisions over hasty implementations.

This philosophy is not about rejecting modern frameworks, libraries, or paradigms. It’s about using them deliberately, understanding their trade-offs, and avoiding over-engineering. It’s about crafting solutions tailored to the problem, not the latest trends. Last but not least, it's about mastering the craft of software engineering, instead of playing copy & paste from Stack Overflow or ChatGPT.

Dependencies deserve particular scrutiny. While external libraries can save time, they also bring risks: update fatigue, security vulnerabilities, bloat, and the potential to derail your entire project. Often, the functionality you need amounts to just 5% of what a library provides. In such cases, writing your own solution is often simpler, faster, and more sustainable. However, it’s crucial to first read and understand the code of the libraries. While this might seem like a lot of work to the modern programmer, it’s actually an investment in your skills and expertise.

Neo-pragmatic design emerged from my own hard-earned lessons. Painful experiences with overly complex codebases taught me the value of simplicity. This understanding drove me to create a library like `defuss` — an efficient, minimalist framework designed to solve real problems without unnecessary complexity.

To my fellow developers: stop building sandcastles of abstraction that crumble under scrutiny. Stop writing glue-code that merely ties together third-party solutions. Instead, embrace simplicity. Understand your craft. Write code that you can explain, defend, and maintain. 

The modern development ecosystem offers extraordinary tools, but they are not solutions in themselves. They are only as good as the understanding with which they’re applied. Let’s prioritize clarity, efficiency, and practicality in our work — and create software that truly stands the test of time. 

In the end, this is *real* programming, and only *real programming* is *real fun*.

<h3 align="center"> 

`defuss` is pragmatic 🛠️

</h3>

Enter `defuss`: a framework crafted to de-fuzz modern web development. This project was born from one deep belief: Web development doesn’t have to be this complex. It doesn’t have to steal your sanity.

It’s a tiny yet powerful foundation for building your next product, offering tooling and an API that resembles the simplicity of the golden days.  But more than just a framework, `defuss` embodies the original hacker philosophy — challenging you to keep learning, keep sharpening your skills, and continually evolve as a sharper thinker, a more thoughtful engineer, and an inspiring tinkerer.

`defuss` brings stability where chaos reigns. It gives you control where reactivity sneaks in at the least expected moments. And it does so by being unapologetically simple. Every line of `defuss`’ code explicitly states what it does. There are *no hidden automata*. It's so simple, you can read and understand every line of its just a few-hundred lines short, well-documented, and elegant codebase.

Because `defuss` is tiny and simple, it’s also a highly customizable  framework. Need a custom core feature? Why don't you simply *fork* and *adapt* it? Try this with React or Solid.js - good luck! ;)

<h3 align="center">

The `defuss` Philosophy 🧠

</h3>

The best code is readable code — code that only does what actually *needs* to be done. Code that comes with clear documentation about *why* it exists in its current form. Code that is *efficient* and mindful of resources. Code, born not from lazy *copy & paste* rituals without actual understanding, but from deliberate, thought design. Start by questioning the requirements, narrowing the scope, and building a solution. Then simplify, refine, and simplify again — until there is nothing left to take away. That’s the real software craftsmanship.

Instead of piling and puzzling libraries together, we _**de-fuzzers**_ master *real* programming. We research a technology, understand its capabilities and limits. We read the code of a library before relying on outdated documentation. By learning what the library *actually* does, we sharpen our skills, craft tailored algorithms, and often eliminate the need for unnecessary dependencies altogether. 

With a deep understanding of technology and a commitment to excellent, simple and elegant solutions, we create amazing products with a fraction of the usual time and effort.

Because what’s the only code that cannot malfunction? The only code that costs nothing? The code that doesn’t need maintenance? Right — the code that was never written in the first place!

<h3 align="center">

Should I try `defuss`? 🤔

</h3>

It will take you just a few minutes, and you'll potentially learn something new! So..., _**why not?**_

I actually hope that you’ll enjoy building your next project with `defuss`! Of course you should start building a small spare-time project, before you jump in an enterprise project built on `defuss` head-first.

You might write a few extra lines of code, because `defuss` intentionally lacks reactivity. But on the other hand, you’ll always know exactly *what’s* happening, *where* it’s happening, and *why* it’s happening.

Many frameworks and libraries **won't** work with `defuss`! In the philosophy of `defuss`, that's a good thing! Read the code of your favourite library/framework, learn how it works and re-build it yourself. You'll have **fun**, it will be **exactly what you need**, you will **master** your code, and you'll become a better engineer doing so.

Worried about **stability**? Relax. There’s not much that can go wrong with `defuss`, because there’s simply not much *code* in `defuss` to begin with. `defuss` is just a thin, opinionated layer of abstraction. If something breaks, it's so tiny, simple and well-documented, that you can **fix it yourself** _(or with the help of AI, if you're still learing how to code!)_.

- Professor Defuss

<h2 align="center">Meet Professor Defuss!</h2>

<table>
  <tr>
  <td width="100px">
    <img src="assets/defuss_mascott.png" width="100px" />
    <center><b>Professor Defuss</b></center>
  </td>
  <td>

      Hello, hello, I'm Professor Defuss! Hmm-ya, yes, yes, I can be a bit fussy at times, but don't sratch your head! I'll teach you how defuss actually works - and to write simple, elegant code... errm - defussed code! Because, as my dear uncle Einstein used to say: "Everything should be made as simple as possible, but not simpler!"

  </td>
  </tr>
</table>

---
---

<h2 align="center">

The `defuss` Book

</h2>

<h3 align="center">

_- Work in progress -_

</h3>

---


### Table of Contents (ToC)

#### 0. Introduction

#### 1. WebTech Masterclass

##### 1.1 The Lifecycle of modern WebApps
##### 1.2 The DOM API: HTML and CSS decomposed
##### 1.3 A modern, vanilla JavaScript WebApp
##### 1.4 The point of transpilation and bundling
##### 1.5 CSS: Component vs. utility classes
##### 1.6 The promises of abstraction and reactivity
##### 1.7 Ideology vs. Pragmatism: OOP edition
##### 1.8 Ideology vs. Pragmatism: FP edition
##### 1.9 Sweet-spot: Thin layers of abstraction
##### 1.10 Sweet-spot: Simple, explicit code

#### 2. The `defuss` Way

##### 2.1 Why JSX?
##### 2.2 JSX in `defuss`: The `defuss/renderer`
##### 2.3 `jQuery`'s API was a great idea!
##### 2.4 `defuss/dequery`: A new take on `jQuery`
##### 2.5 Tiny CSS utilities: `defuss/dewind`
##### 2.6 Vite-support: The `defuss-vite` plugin
##### 2.7 Writing an Astro Integration: `defuss-astro`
##### 2.8 Setup from scratch: `defuss` + `Astro`
##### 2.9 Setup from scratch: `defuss` + `Vite`
##### 2.10 Becoming a core developer of `defuss`

#### 3. Let's play `defuss`!

##### 3.1 Your `defuss` portfolio website
##### 3.2 PWA: Your portfolio becomes a digital VCard
##### 3.3 Need for Speed: Service Workers edition
##### 3.4 `defuss` Music: A synthesizer with Audio Worklets 
##### 3.5 Building `defuss/devtools` as a browser extension
##### 3.6 DOOM runs on `defuss`! Integrating WebAssembly modules
##### 3.7 TauriSweeper: A MineSweeper-clone built with `Tauri` + `defuss`

### 0. Introduction

`defuss` is a web framework. It's meant to support you writing elegant, tailor-made code for your next WebApp. This might be a portfolio website, a blog, an enterprise business web app, a portable mobile web application (PWA), or a desktop app that you build with web technologies (Tauri, Electron). While `defuss` primarily focuses on frontend (browser) technologies right now, tiny abstraction libraries for common backend tasks are in-scope too.

TODO!

---

<img src="assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>