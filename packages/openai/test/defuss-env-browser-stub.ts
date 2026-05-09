/** Browser stub for defuss-env — provides same API but no-op for file operations. */
export type EnvMap = Record<string, string>;

declare const __BROWSER_ENV__: Record<string, string>;

const store: EnvMap = { ...__BROWSER_ENV__ };

export function load(_path: string, _overwrite = true, _throw = false): void {
	// No-op in browser
}

export function getEnv(name: string, fallback = ""): string {
	return store[name] ?? fallback ?? "";
}

export function setEnv(name: string, value: string): void {
	store[name] = value;
}
