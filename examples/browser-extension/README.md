# defuss-extension

> Browser Extension blueprint

TODO: Should use defuss-orchestrator instead of custom orchestrator (server logic).
  
### As a Developer

You're very welcome to contribute to this project.

1. Install dependencies:

```bash
bun install
```

2. Build the extension

```bash
bun run build
```

Find the output in `./dist`.

This command will compile a new version of this extension that you can load in Chrome/Chromium/Microsoft Edge/Safari/Firefox (enable developer mode and load unpackaged extension from disk).

### MCP Example Notes

`bun run test:file-search` launches `mcp-server.ts` as a child MCP server over stdio.

`bun run test:doctor-search` does the same and calls the `116117_search` MCP tool.

Do not run `bun run mcp` at the same time as `bun run test:file-search`, because both flows would try to own the same HTTP work-queue server on port `3210`.

The same restriction applies to `bun run test:doctor-search`.
