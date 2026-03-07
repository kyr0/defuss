# defuss-storybook

A lightweight storybook for [defuss](https://github.com/kyr0/defuss) components. Zero-config, Vite-powered, with dynamic prop controls and Playwright testing.

## Quick Start

```bash
# Start dev server (scans for *.storybook.tsx files)
bunx defuss-storybook dev .

# Build static storybook
bunx defuss-storybook build .

# Run render tests
bunx defuss-storybook run .
```

## Story Format

Create `*.storybook.tsx` files alongside your components:

```tsx
import { Button } from "defuss-shadcn";

export const meta = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
      defaultValue: "default",
    },
    disabled: { control: "boolean", defaultValue: false },
  },
};

export const Primary = () => <Button>Click me</Button>;

export const Secondary = () => <Button variant="secondary">Secondary</Button>;

export const Destructive = () => <Button variant="destructive">Delete</Button>;
```

## MDX Documentation

Create `*.storybook.mdx` files for documentation pages:

```mdx
---
title: Getting Started
---

# Getting Started

Welcome to the component library documentation.

import { Button } from "defuss-shadcn";

<Button>Live example</Button>
```

## Configuration

Optionally create a `storybook.config.ts` in your project root:

```ts
import { defineConfig } from "defuss-storybook";

export default defineConfig({
  stories: ["src/**/*.storybook.{tsx,mdx}"],
  port: 6006,
  title: "My Component Library",
  browser: "chromium",
  outDir: ".storybook",
});
```

## License

MIT
