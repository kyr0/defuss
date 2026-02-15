

<full-context-dump>
./index.html:
```
<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/webp" href="/favicon.webp" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vite + TS + defuss + defuss-dson</title>
  <link rel="stylesheet" href="node_modules/defuss-squeezy/squeezy.css" />
</head>

<body class="vbox justify-center text-center">
  <div id="app" class="hbox" style="max-width: 1280px"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>

</html>
```

./LICENSE:
```
MIT License

Copyright (c) 2019 - 2025 Aron Homberg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

./package.json:
```
{
  "name": "@example/with-dson",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "clean": "rm -rf node_modules/.vite && rm -rf ./dist && rm -rf ./turbo",
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@monaco-editor/loader": "^1.7.0",
    "browserslist": "^4.28.1",
    "defuss": "^2.1.10",
    "defuss-dson": "^1.1.1",
    "defuss-vite": "^1.1.3",
    "vite": "^6.4.1",
    "lightningcss": "^1.30.2"
  },
  "packageManager": "bun@1.3.9"
}
```

./README.md:
```
<h1 align="center">

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-vite-ts/public/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

`Vite` + `TypeScript` + `defuss` + `defuss-dson` Starter Kit

</sup>

</h1>

With this template, you can jumpstart your next `Vite` + `defuss` + `defuss-dson` project!

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/kyr0/defuss/tree/main/examples/with-dson)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/kyr0/defuss?devcontainer_path=.devcontainer/with-dson/devcontainer.json)

> 👩‍💻 **Seasoned developer?** Delete this file. Have fun!

![just-the-basics](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-dson/public/preview.png)

### ✨ It's amazing!
![tiny](https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-dson/public/build_result.png)

## 🛠️ Setup

### 1. Get a decent package manager

We recommend using `bun` as a package manager. It's fast, mature and handles monorepos well. If you haven't installed `bun` yet:

```bash
npm i -g bun@^1.3.9
```

### 2. Install the projects dependencies

```bash
bun i --frozen
```

## 🚀 Project Structure

Inside of your Vite project, you'll see the following relevant folders and files:

```text
/
├── src/components/MonacoEditor.tsx
├── src/components/Repl.tsx
├── src/main.tsx
├── src/style.css
├── index.html
├── tsconfig.json
├── package.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun dev`    | Run in dev mode and check your custom renderer                                                    |
| `bun build` | Build for production  |
| `bun preview` | Build for production, then preview |

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on <code>defuss</code> Island!</b></i></caption>
```

./src/components/MonacoEditor.ts:
```
import loader from "@monaco-editor/loader";

const monaco = await loader.init();

export type Langauge = "javascript";

export interface CodeEditorConfig {
  language: string;
  theme: string;
  fontSize?: number;
  onReturn?: (value: any) => void;
  onChange?: (value: string) => void;
}

export interface CodeEditorData {
  language: Langauge;
  code: string;
}

export class MonacoEditor {
  public data: CodeEditorData;
  public config: CodeEditorConfig;
  public readOnly: boolean;
  public monacoEditor: any;
  public el: HTMLElement | null;

  constructor(
    data: CodeEditorData,
    config: CodeEditorConfig,
    readOnly: boolean,
  ) {
    this.data = data;
    this.config = config;
    this.readOnly = readOnly;
    this.el = null;
    this.initializeMonacoEditor();
  }

  private async initializeMonacoEditor() {
    this.el = document.createElement("div");
    this.el.style.width = "100%";
    this.el.className = "hbox";

    const editorContainerWrapper = document.createElement("div");
    editorContainerWrapper.className = "vbox w-full";

    // create a div element for the editor
    const editorContainer = document.createElement("div");
    editorContainer.style.width = "100%";
    editorContainer.style.minHeight = "100%";

    // append the editor and run button to the main element
    editorContainerWrapper.appendChild(editorContainer);
    this.el.appendChild(editorContainerWrapper);

    const outputContainerWrapper = document.createElement("div");
    outputContainerWrapper.className = "mb-lg";
    outputContainerWrapper.id = `output-${Math.random().toString(36).substring(2, 9)}`;
    this.el.appendChild(outputContainerWrapper);

    this.monacoEditor = monaco.editor.create(editorContainer, {
      value: this.data.code,
      language: this.config.language || "javascript",
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
      readOnly: this.readOnly,
      lineNumbers: "off",
      fontSize: this.config.fontSize || 16,
      roundedSelection: true,
      hideCursorInOverviewRuler: true,
      scrollBeyondLastLine: false,
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      wordWrap: "on",
      wrappingStrategy: "advanced",
    });

    monaco.editor.setTheme(this.config.theme || "vs-dark");

    const computedStyle = editorContainer.getBoundingClientRect();
    let ignoreEvent = false;
    const updateHeight = () => {
      if (ignoreEvent) return;
      const contentHeight = Math.min(500, this.monacoEditor.getContentHeight());
      editorContainer.style.height = `${contentHeight}px`;

      const computedStyle = editorContainer.getBoundingClientRect();
      try {
        ignoreEvent = true;
        this.monacoEditor.layout({
          width: computedStyle.width,
          height: Math.max(50, contentHeight),
        });
      } finally {
        ignoreEvent = false;
      }
    };
    this.monacoEditor.onDidContentSizeChange(updateHeight);

    this.monacoEditor.layout({ width: computedStyle.width, height: 50 });
    updateHeight();

    this.monacoEditor.onDidChangeModelContent(() => {
      this.data.code = this.monacoEditor.getValue();
      this.config.onChange?.(this.data.code);
      updateHeight();
    });
  }

  executeCode(code: string) {
    const run = new Function(`return (async() => {${code}})()`);
    const result = run();
    this.config.onReturn?.(result);
  }

  public layout() {
    this.monacoEditor.layout();
  }

  public getValue() {
    return this.monacoEditor.getValue();
  }

  public getDomNode() {
    return this.el;
  }

  public setValue(data: CodeEditorData) {
    this.data = data;
    this.monacoEditor.setValue(data.code);
  }

  public dispose() {
    this.monacoEditor.dispose();
  }
}

```

./src/components/Repl.tsx:
```
import { createRef, type CSSProperties } from "defuss";
import { DSON } from "defuss-dson";
import { MonacoEditor } from "./MonacoEditor";

const textareaStyle: CSSProperties = {
  width: "40vw",
  borderRadius: "0.5rem",
  marginTop: "1rem",
  padding: "1rem",
  height: "550px",
  textAlign: "left",
};

const exampleCode = `const map = new Map();
map.set("name", "defuss");
map.set("age", 1);

const set = new Set();
set.add("name");
set.add("defuss");

const arrayOfRegexes = [/[a-zA-Z0-9]/];

// custom class support
class Foo {
  constructor(foo = 123) {
    this.foo = foo;
    console.log("Foo constructor called with:", foo);
  }
}

const objects = {
  name: "defuss",
  age: 39,
  authorEmail: "info@aron-homberg.de",
}
objects.circularReference = objects; // no problem

const everything = {
  maps: [map],
  sets: [set],
  arrays: [arrayOfRegexes],
  regex: /[a-zA-Z0-9]/,
  objects: [objects, new Foo(345)]
};

const serialized = await DSON.stringify(everything); 

// pass custom class constructor functions if used
const parsed = await DSON.parse(serialized);

const isEqual = await DSON.isEqual(
  { ...everything },
  parsed,
);

console.log("DSON parsed:");
console.dir(parsed);

console.log("DSON isEqual (parsed vs. everything):", isEqual);

const clone = await DSON.clone(parsed)

console.log("DSON clone:", clone, "isEqual:", await DSON.isEqual(clone, everything));

return serialized;`;

// @ts-ignore
window.DSON = DSON;

export const Repl = () => {
  const codeRef = createRef<string, HTMLTextAreaElement>();
  const serializationRef = createRef<string, HTMLTextAreaElement>();

  // co-routine to run when ready
  const onMount = async () => {
    const codeEditor = new MonacoEditor(
      {
        language: "javascript",
        code: exampleCode,
      },
      {
        language: "javascript",
        theme: "vs-dark",
        onReturn: async (value) => {
          updateResultEditor(await value);
        },
        onChange: (value) => {
          console.clear();
          codeEditor.executeCode(value);
        },
      },
      false,
    );

    codeRef.update(codeEditor.getDomNode());

    const resultEditor = new MonacoEditor(
      {
        language: "javascript",
        code: "",
      },
      {
        language: "javascript",
        theme: "vs-dark",
      },
      true,
    );
    serializationRef.update(resultEditor.getDomNode());

    const updateResultEditor = (value: string) => {
      resultEditor.setValue({
        code: value,
        language: "javascript",
      });
    };

    queueMicrotask(() => {
      codeEditor.layout();
      resultEditor.layout();
      codeEditor.executeCode(codeEditor.getValue());
    });
  };

  return (
    <div class={"vbox"} onMount={onMount}>
      <div>
        <h4>JavaScript</h4>

        <div
          ref={codeRef}
          style={{
            ...textareaStyle,
            marginRight: "1rem",
          }}
        ></div>
      </div>
      <div>
        <h4>DSON</h4>

        <div
          style={{
            ...textareaStyle,
            marginLeft: "1rem",
          }}
          ref={serializationRef}
        ></div>
      </div>
    </div>
  );
};

```

./src/main.tsx:
```
import { Repl } from "./components/Repl";
import "./styles/reset.css";
import "./styles/palette.css";
import "./styles/squeezy.css";
import "./styles/style.css";

import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { $ } from "defuss";
import { render } from "defuss/client";

function App() {
  return (
    // fragments work
    <>
      <div class="pt-lg vbox justify-center">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          {/* class works */}
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a
          href="https://www.github.com/kyr0/defuss"
          target="_blank"
          rel="noreferrer"
        >
          {/* className works too */}
          <img
            src="/defuss_mascott.png"
            className="logo defuss"
            alt="defuss logo"
          />
        </a>
        <a
          href="https://www.typescriptlang.org/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={typescriptLogo}
            class="logo vanilla"
            alt="TypeScript logo"
          />
        </a>
      </div>

      <h1>Vite + defuss + TypeScript + defuss-dson</h1>
      <div class="p-lg vbox justify-center">
        <Repl />
      </div>

      <p class="dim">
        Check the console for errors and DSON deserialized output!
      </p>
    </>
  );
}
// initial render
render(<App />, $("#app"));

```

./src/styles/style.css:
```
:root {
  --squeezy-font-scale-factor: 0.1;
}

.logo {
  height: 6em;
  width: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vanilla:hover {
  filter: drop-shadow(0 0 2em #3178c6aa);
}

/** counter */
button {
  border-radius: 8px;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: var(--color-primary);
  cursor: pointer;
  transition: background-color 0.25s;
}

button:hover {
  background-color: var(--color-primary-light);
}

button:focus,
button:focus-visible {
  outline: 4px auto var(--color-secondary);
}

.run-code {
  width: 50px;
  height: 50px;
  margin: 0.5rem;
  transform: rotate(-90deg);
  font-size: 1.5rem;
  padding-top: 6px;
  position: absolute;
  top: 0;
  display: block;
  right: 0;
  z-index: 9;
}

@media (max-width: 767px) {
  .run-code {
    padding-left: 6px;
    padding-top: 4px;
    width: 30px;
    height: 30px;
    font-size: 1rem;
  }
}

```

./src/vite-env.d.ts:
```
/// <reference types="vite/client" />

```

./tsconfig.json:
```
{
  "compilerOptions": {
    "target": "ES2023",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* defuss JSX */
    "jsx": "react-jsx",
    "jsxImportSource": "defuss"
  },
  "include": ["src"]
}

```

./vite.config.ts:
```
import { defineConfig, type Plugin } from "vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

// import the defuss plugin
import defuss from "defuss-vite";

export default defineConfig({
  // the plugin needs to be integrated so that the transpilation works
  plugins: [defuss() as Plugin],

  css: {
    transformer: "lightningcss",
    lightningcss: {
      targets: browserslistToTargets(browserslist(">= 0.25%")),
    },
  },

  build: {
    target: "esnext",
    cssMinify: "lightningcss",
  },
});

```


</full-context-dump>
