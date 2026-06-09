import type { ValidationSchema, ValidationResult } from "./index.js";

/** Valid boolean string values */
const BOOLEAN_TRUE = "true";
const BOOLEAN_FALSE = "false";

/**
 * Validates parsed frontmatter against a schema.
 * Checks required fields exist and optionally validates value types.
 * Returns merged data with defaults for missing optional fields.
 */
export function validate(
	meta: Record<string, string>,
	schema: ValidationSchema
): ValidationResult {
	const errors: string[] = [];
	const data: Record<string, string> = { ...meta };

	for (const [field, rule] of Object.entries(schema)) {
		const hasValue = field in meta;
		const value = meta[field];

		// Check required
		if (rule.required && !hasValue) {
			errors.push(`Missing required field: ${field}`);
			continue;
		}

		// Apply default for missing optional fields
		if (!hasValue && rule.default !== undefined) {
			data[field] = rule.default;
		}

		// Type check (only if the field has a value)
		if (hasValue) {
			const error = checkType(field, value, rule.type);
			if (error) {
				errors.push(error);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		data,
	};
}

/**
 * Checks if a string value matches the expected type.
 * Returns an error message string if the type check fails, or null if valid.
 */
function checkType(
	field: string,
	value: string,
	type: ValidationSchema[string]["type"]
): string | null {
	switch (type) {
		case "number":
			if (Number.isNaN(Number(value))) {
				return `Field '${field}' must be a number`;
			}
			return null;

		case "boolean":
			if (value !== BOOLEAN_TRUE && value !== BOOLEAN_FALSE) {
				return `Field '${field}' must be a boolean`;
			}
			return null;

		case "date":
			// Check if the value parses to a valid Date
			if (Number.isNaN(Date.parse(value))) {
				return `Field '${field}' must be a date`;
			}
			return null;

		case "string":
			// All values are strings, always valid
			return null;
	}

	// type is undefined — no type check needed
	return null;
}
