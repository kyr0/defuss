import type { ToolCall } from './types.js';

const OPEN = '<zyphra_tool_call>';
const CLOSE = '</zyphra_tool_call>';

export function parseZyphraToolCalls(content: string): ToolCall[] {
	const result: ToolCall[] = [];
	let remaining = content;

	while (true) {
		const start = remaining.indexOf(OPEN);
		if (start === -1) break;
		const end = remaining.indexOf(CLOSE, start);
		if (end === -1) break;

		const block = remaining.slice(start + OPEN.length, end);
		remaining = remaining.slice(end + CLOSE.length);

		const funcMatch = block.match(/<function=(\w+)>/);
		if (!funcMatch) continue;
		const name = funcMatch[1] ?? '';

		const args: Record<string, string> = {};
		const lines = block.split('\n');
		let currentKey = '';
		let currentVal: string[] = [];

		for (const raw of lines) {
			const line = raw.trim();
			const keyMatch = line.match(/^<(\w+)(?:=(\w+))?>$/);
			if (keyMatch) {
				if (currentKey) args[currentKey] = currentVal.join('\n').trim();
				const tag = keyMatch[1]!;
				const attr = keyMatch[2];
				if (tag === 'function') continue;
				currentKey = attr ?? tag;
				currentVal = [];
				continue;
			}
			const closeMatch = line.match(/^<\/(\w+)>$/);
			if (closeMatch) {
				if (currentKey) {
					args[currentKey] = currentVal.join('\n').trim();
					currentKey = '';
					currentVal = [];
				}
				continue;
			}
			if (currentKey) currentVal.push(raw);
		}
		if (currentKey) args[currentKey] = currentVal.join('\n').trim();

		const paramKeys = Object.keys(args);
		const argStr = paramKeys.length
			? JSON.stringify(Object.fromEntries(paramKeys.map((k) => [k, args[k]])))
			: '{}';

		result.push({
			id: 'call_' + Math.random().toString(36).slice(2, 10),
			type: 'function',
			function: { name, arguments: argStr },
		});
	}

	return result;
}
