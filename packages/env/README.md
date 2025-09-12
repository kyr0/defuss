<h1 align="center">

<img src="https://github.com/kyr0/defuss/blob/main/assets/defuss_mascott.png?raw=true" width="100px" />

<p align="center">
  
  <code>defuss-env</code>

</p>

<sup align="center">

Secure environment variable loader and parser with TypeScript support

</sup>

</h1>

<h3 align="center">
Usage
</h3>

Load and parse `.env` files with strict validation and security features:

```bash
npx defuss-env               # parse and print ./.env
npx defuss-env path/to/file  # parse and print the given .env file
```

Or install globally or locally in a project:

```bash 
npm install defuss-env
```

<h4>Programmatic API</h4>

```typescript
import { load, parse, getEnv, setEnv } from "defuss-env";

// Load from file (no injection by default)
const env = load(".env");
console.log(env.DATABASE_URL);

// Load and inject into process.env
load(".env", true /* inject */);

// Load with override of existing values
load(".env", true /* inject */, true /* override */);

// Parse content string directly
const parsed = parse(`
  # Database configuration
  DB_HOST=localhost
  DB_PORT=5432
  DATABASE_URL="postgresql://user:pass@localhost:5432/db"
`);

// In-memory environment management
setEnv("API_KEY", "secret-value");
const apiKey = getEnv("API_KEY", "fallback-value");
```

<h3 align="center">
Overview
</h3>

> `defuss-env` is a secure, TypeScript-first environment variable loader that prioritizes safety and validation. Unlike other .env loaders, it enforces strict size limits, validates variable names, and provides an in-memory store for sensitive values that never touch `process.env`.

> It supports standard .env syntax with comments, quoted values, and export statements, while providing protection against oversized files and values that could cause memory issues.

<h3 align="center">

Features

</h3>

- **Security First**: Hard caps on file size (256KB) and value length (64KB)
- **Strict Validation**: POSIX-compliant environment variable names only
- **In-Memory Store**: Secure storage for sensitive values separate from `process.env`
- **TypeScript Ready**: Full TypeScript support with proper type definitions
- **Standard Syntax**: Supports comments, quotes, escapes, and export statements
- **No Process Mutation**: Parse without modifying `process.env` by default
- **CLI Tool**: Built-in command-line interface for debugging and inspection
- **Node.js Only**: Server-side safety with explicit browser bundling prevention

<h3 align="center">

Supported .env Syntax

</h3>

```bash
# Comments are supported
export DATABASE_URL="postgresql://localhost:5432/mydb"

# Unquoted values (comments stripped)
API_HOST=api.example.com  # production endpoint

# Single-quoted values (literal, no escaping)
SECRET_KEY='raw$tring#with!special@chars'

# Double-quoted values (with escape sequences)
MULTILINE="line1\nline2\ttabbed"
ESCAPED_QUOTES="He said \"Hello World\""

# Values with special characters
URL="https://example.com?param=value#fragment"

# Export prefix is optional
export NODE_ENV=production
DEBUG=true
```

<h3 align="center">

API Reference

</h3>

#### `parse(content: string): EnvMap`

Parse a .env file content string into a key/value map.

```typescript
const env = parse(`
  FOO=bar
  QUOTED="value with spaces"
`);
// Returns: { FOO: "bar", QUOTED: "value with spaces" }
```

#### `load(filePath?, inject?, override?): EnvMap`

Load and parse a .env file from disk.

- `filePath` (string, default: ".env"): Path to the .env file
- `inject` (boolean, default: false): Whether to inject into `process.env`
- `override` (boolean, default: false): Whether to override existing values

```typescript
// Parse only (safe)
const env = load(".env");

// Parse and inject new variables only
load(".env", true);

// Parse and inject, overriding existing variables
load(".env", true, true);
```

#### `getEnv(name: string, fallback?: string): string | undefined`

Retrieve a variable from in-memory store, then `process.env`, then fallback.

```typescript
const dbUrl = getEnv("DATABASE_URL", "sqlite://memory");
```

#### `setEnv(name: string, value: string): void`

Set a variable in the in-memory store (does not modify `process.env`).

```typescript
setEnv("API_TOKEN", "secret-token");
// API_TOKEN is now available via getEnv() but not in process.env
```

#### `isValidEnvKey(name: string): boolean`

Check if a variable name follows POSIX conventions.

```typescript
isValidEnvKey("VALID_NAME");    // true
isValidEnvKey("1INVALID");      // false
isValidEnvKey("also-invalid");  // false
```

<h3 align="center">

Security Features

</h3>

- **File Size Limit**: Refuses to read files larger than 256KB
- **Value Length Limit**: Throws error on values exceeding 64KB
- **Name Validation**: Only accepts POSIX-compliant variable names (`/^[A-Za-z_][A-Za-z0-9_]*$/`)
- **No Process Mutation**: Parse without side effects by default
- **In-Memory Secrets**: Store sensitive values without exposing them in `process.env`
- **Node.js Only**: Explicit server-side usage with browser bundling protection

<h3 align="center">

CLI Tool

</h3>

The included CLI tool helps debug and inspect .env files:

```bash
# Parse and display .env
npx defuss-env

# Parse specific file
npx defuss-env config/production.env

# Example output:
# Read 3 entries from .env:
# DATABASE_URL=postgresql://localhost:5432/mydb
# NODE_ENV=production
# PORT=3000
```

<h3 align="center">

Error Handling

</h3>

`defuss-env` provides clear error messages for common issues:

```typescript
// File too large
load("huge-file.env");
// Error: Refusing to read huge-file.env: size 300000 > 262144 bytes

// Value too long
parse("BIG_VALUE=" + "x".repeat(70000));
// Error: Value for BIG_VALUE exceeds maximum length of 65536 characters

// Invalid variable name
parse("1INVALID=value");  // Silently ignored (follows .env conventions)

// File not found
load("missing.env");
// Error: ENOENT: no such file or directory, open 'missing.env'
```

<h3 align="center">

Why defuss-env?

</h3>

- **Security**: Built-in protection against oversized files and values
- **Type Safety**: Full TypeScript support with proper type definitions
- **Separation of Concerns**: In-memory store for secrets vs. environment variables
- **Standard Compliance**: Follows .env conventions while adding safety features
- **Zero Dependencies**: Lightweight with no external dependencies
- **Server-First**: Designed for Node.js with explicit browser protection

<p align="center">

  <img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" width="400px" />

</p>

<p align="center">
  <i><b>Come visit us on <code>defuss</code> Island!</b></i>
</p>