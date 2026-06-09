/**
 * Serializes a plain object to frontmatter text.
 * Returns `---\nkey: value\n...\n---\n` format.
 * String values containing newlines, colons, or quotes are double-quoted.
 */
export function write(meta: Record<string, string>): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(meta)) {
    lines.push(formatLine(key, value));
  }

  lines.push("---");
  return lines.join("\n") + "\n";
}

/**
 * Formats a single key: value line, quoting the value if necessary.
 * Values are quoted when they contain colons, newlines, double quotes,
 * or have leading/trailing whitespace.
 */
function formatLine(key: string, value: string): string {
  if (needsQuoting(value)) {
    // Escape backslashes, double quotes, and newlines; wrap in double quotes
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    return `${key}: "${escaped}"`;
  }
  return `${key}: ${value}`;
}

/**
 * Returns true if the value should be quoted in the output.
 * We quote values that contain special characters that would break parsing.
 */
function needsQuoting(value: string): boolean {
  if (!value) return false;

  // Quote if contains colon, newline, double quote, or has leading/trailing whitespace
  return (
    value.includes(":") ||
    value.includes("\n") ||
    value.includes('"') ||
    value !== value.trim()
  );
}
