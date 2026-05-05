declare module "virtual:defuss-ssg/content" {
	import type { ContentEntry, ContentGlobOptions } from "defuss-ssg";

	export function glob(
		patterns: string | string[],
		options?: ContentGlobOptions,
	): Promise<ContentEntry[]>;
}