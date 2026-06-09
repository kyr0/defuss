export interface ParseResult {
	/** Parsed key-value pairs from the frontmatter block. */
	meta: Record<string, string>;
	/** The body text after the closing --- delimiter. */
	body: string;
}

export interface ValidationSchema {
	[field: string]: {
		/** If true, the field must be present. */
		required?: boolean;
		/** Expected type of the value. */
		type?: "string" | "number" | "boolean" | "date";
		/** Default value when the field is missing and not required. */
		default?: string;
	};
}

export interface ValidationResult {
	/** True if all required fields are present and type checks pass. */
	valid: boolean;
	/** List of human-readable error messages. Empty when valid. */
	errors: string[];
	/** Merged data with defaults applied for missing optional fields. */
	data: Record<string, string>;
}

export { parse } from "./parser.js";
export { write } from "./writer.js";
export { validate } from "./validator.js";
