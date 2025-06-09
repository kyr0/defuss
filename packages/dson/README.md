# defuss-dson

*D*efinitely-typed *S*erialized *O*bject *N*otation (DSON)

A TypeScript-first serialization library that extends JSON to support complex JavaScript data types while preserving type information and prototype chains.

## Overview

`defuss-dson` serializes JavaScript data structures into JSON while preserving metadata about their original types. It's a superset of JSON, meaning any valid JSON is also valid DSON. However, with DSON, when you serialize complex types like `Map`, `Set`, `Date`, `RegExp`.

## Features

- 🔄 **Bidirectional serialization** - Parse and stringify with full type preservation
- 🧬 **Deep cloning** - Create deep copies of complex objects with async support
- ⚖️ **Equality comparison** - Smart comparison that handles complex nested structures
- 🔗 **Circular reference support** - Handles circular references safely
- 🌐 **Universal compatibility** - Works in browsers, Node.js, and other JavaScript environments

## Installation

```bash
npm install defuss-dson
```

## Supported Data Types

DSON supports serialization of:

### Primitives
- `string`, `number`, `boolean`, `null`, `undefined`
- `bigint`

### Built-in Objects
- `Date`, `RegExp`, `Error`
- `Map`, `Set`, `WeakMap`, `WeakSet`
- `ArrayBuffer`, `DataView`
- Typed arrays (`Uint8Array`, `Int32Array`, etc.)

## API Reference

DSON provides two API layers:

### 1. JSON-Compatible Synchronous API

Perfect for simple use cases and JSON replacement:

```typescript
import DSON from 'defuss-dson';

// Synchronous API - works like JSON
const data = new Map([['key', 'value']]);
const serialized = DSON.stringify(data);
const parsed = DSON.parse(serialized);

// Additional utilities
const isEqual = DSON.isEqual(data, parsed); // true
const cloned = DSON.clone(data);
```

## Usage Examples

### Basic Data Types

```typescript
import DSON from 'defuss-dson';

// Dates
const date = new Date();
const serialized = DSON.stringify(date);
const parsed = DSON.parse(serialized);
console.log(parsed instanceof Date); // true

// RegExp
const regex = /test/gi;
const serializedRegex = DSON.stringify(regex);
const parsedRegex = DSON.parse(serializedRegex);
console.log(parsedRegex instanceof RegExp); // true
console.log(parsedRegex.source); // "test"
console.log(parsedRegex.flags); // "gi"

// Maps and Sets
const map = new Map([['a', 1], ['b', 2]]);
const set = new Set([1, 2, 3]);
const data = { map, set };

const serialized = DSON.stringify(data);
const parsed = DSON.parse(serialized);
console.log(parsed.map instanceof Map); // true
console.log(parsed.set instanceof Set); // true
```

### Circular References

```typescript
const obj = { name: 'parent' };
obj.self = obj; // circular reference

const serialized = DSON.stringify(obj);
const parsed = DSON.parse(serialized);
console.log(parsed.self === parsed); // true
```

### Deep Cloning

```typescript
import { clone } from 'defuss-dson';

const complex = {
  date: new Date(),
  map: new Map([['key', 'value']]),
  nested: {
    array: [1, 2, { deep: true }]
  }
};

const cloned = await clone(complex);
console.log(DSON.isEqual(complex, cloned)); // true
console.log(complex !== cloned); // true (different object)
```

### Equality Comparison

```typescript
const obj1 = {
  date: new Date('2023-01-01'),
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3])
};

const obj2 = {
  date: new Date('2023-01-01'),
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3])
};

console.log(DSON.isEqual(obj1, obj2)); // true
console.log(obj1 === obj2); // false
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our [GitHub repository](https://github.com/kyr0/defuss).

---

Part of the [defuss](https://github.com/kyr0/defuss) ecosystem.
