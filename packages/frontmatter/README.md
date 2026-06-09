# defuss-frontmatter

A zero-dependency, isomorphic frontmatter parser, writer, and validator.

## Overview

`defuss-frontmatter` parses simple `key: value` frontmatter blocks delimited by `---`, serializes objects back to frontmatter text, and validates frontmatter against a schema.

Designed for Markdown, MDX, and any text format that uses YAML-style frontmatter — without pulling in a full YAML parser.

## Features

- 📦 **Zero dependencies** — Pure TypeScript, no runtime imports
- 🌐 **Isomorphic** — Works in browsers, Node.js, and Bun
- ✍️ **Parser** — Extract frontmatter from text into `{ meta, body }`
- 📝 **Writer** — Serialize objects to frontmatter text
- ✅ **Validator** — Check required fields and value types
- 🧪 **100% test coverage** — 41 tests across 3 test files

## Installation

```bash
bun add defuss-frontmatter
```

## API Reference

### `parse(text: string): ParseResult`

Extracts frontmatter from the beginning of a text string.

```ts
import { parse } from "defuss-frontmatter";

const input = `---
title: My Page
date: 2025-09-06
---

Body content here.`;

const { meta, body } = parse(input);
// meta = { title: "My Page", date: "2025-09-06" }
// body = "Body content here."
```

If no frontmatter is found, returns `{ meta: {}, body: text }`.

**ParseResult type:**

```ts
interface ParseResult {
  meta: Record<string, string>;
  body: string;
}
```

### `write(meta: Record<string, string>): string`

Serializes a plain object to frontmatter text.

```ts
import { write } from "defuss-frontmatter";

const meta = { title: "My Page", date: "2025-09-06" };
const result = write(meta);
// "---\ntitle: My Page\ndate: 2025-09-06\n---\n"
```

Values containing colons, newlines, or quotes are automatically double-quoted.

### `validate(meta, schema): ValidationResult`

Validates parsed frontmatter against a schema.

```ts
import { validate } from "defuss-frontmatter";

const meta = { title: "My Page", date: "2025-09-06" };
const schema = {
  title: { required: true },
  date: { required: true, type: "date" },
  status: { required: false, default: "draft" },
};

const result = validate(meta, schema);
// result.valid = true
// result.data = { title: "My Page", date: "2025-09-06", status: "draft" }
```

**ValidationSchema type:**

```ts
interface ValidationSchema {
  [field: string]: {
    required?: boolean;
    type?: "string" | "number" | "boolean" | "date";
    default?: string;
  };
}
```

**ValidationResult type:**

```ts
interface ValidationResult {
  valid: boolean;
  errors: string[];
  data: Record<string, string>;
}
```

Supported types: `"string"`, `"number"`, `"boolean"`, `"date"`.

## Frontmatter Format

Frontmatter uses `---` delimiters with simple `key: value` pairs:

```
---
title: My Page
date: 2025-09-06
author: "Jane Doe"
---

Body content starts here.
```

- Values are trimmed automatically
- Quoted values (single or double) have quotes stripped during parsing
- Keys with no value (no colon) parse as empty strings
- Frontmatter must start at line 1

## License

MIT — see [LICENSE](LICENSE) for details.

Part of the [defuss](https://github.com/kyr0/defuss) ecosystem.
