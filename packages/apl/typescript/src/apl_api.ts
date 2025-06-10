// apl_api.ts
/**
 * Minimal global registries for provider and tool callbacks.
 * Pure TypeScript, no external packages.
 */

export type ProviderFn = (
  prompt: string,
  model: string,
  params: Record<string, unknown>,
  tools: unknown[],
) => Promise<string> | string;

export type ToolFn = (...args: unknown[]) => Promise<string> | string;

// ---------- global registries ----------
const providers: Record<string, ProviderFn> = {};
const tools: Record<string, ToolFn> = {};

// ---------- provider registry ----------
export function addProvider(model: string, fn: ProviderFn): void {
  providers[model] = fn;
}

export function removeProvider(model: string): void {
  delete providers[model];
}

export function getProvider(model: string): ProviderFn | undefined {
  return providers[model];
}

export function listProviders(): string[] {
  return Object.keys(providers);
}

// ---------- tool registry --------------
export function addTool(name: string, fn: ToolFn): void {
  tools[name] = fn;
}

export function removeTool(name: string): void {
  delete tools[name];
}

export function getTool(name: string): ToolFn | undefined {
  return tools[name];
}

export function listTools(): string[] {
  return Object.keys(tools);
}
