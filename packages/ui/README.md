<h1 align="center">

<img src="https://github.com/kyr0/defuss/blob/main/assets/defuss_mascott.png?raw=true" width="100px" />

<p align="center">
  
  <code>DEPRECATED: defuss-ui</code>

</p>

<sup align="center">

A modern Shadcn-like component library for defuss that build on Tailwind and Franken UI.

</sup>

</h1>

<h3 align="center">
Overview
</h3>

`defuss-ui` is a modern UI component library for web apps that suits defuss perfectly. It builds on Tailwind CSS and Franken UI. It provides a set of reusable, customizable, and accessible UI components that can be easily integrated into your defuss projects.

<h3 align="center">
Installation
</h3>

As a prerequisite, you need to set-up Tailwind CSS and Franken UI in your defuss project. Please refer to the official documentation of Tailwind CSS and [Franken UI](https://franken-ui.dev/docs/2.1/installation) for installation instructions.

Then, you can install defuss-ui via npm or yarn:

```bash
pnpm install defuss-ui
# or
npm install defuss-ui
# or
yarn add defuss-ui
```

<h3 align="center">
Usage
</h3>

You can import and use the components from `defuss-ui` in your defuss project as follows:

```tsx
import { Button, Card, Modal } from "defuss-ui";

function App() {
  return (
    <div>
      <Card>
        <h2 className="text-xl font-bold mb-4">Welcome to defuss-ui</h2>
        <p className="mb-4">This is a simple card component.</p>
        <Button onClick={() => alert("Button clicked!")}>Click Me</Button>
      </Card>

      <Modal isOpen={true} onClose={() => {}}>
        <h2 className="text-xl font-bold mb-4">Modal Title</h2>
        <p>This is a modal component.</p>
      </Modal>
    </div>
  );
}
```

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code>