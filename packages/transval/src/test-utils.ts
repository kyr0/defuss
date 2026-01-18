/**
 * Test utility functions for transval package
 */

/**
 * Recursively strips sourceInfo from JSX VNode objects.
 * This is useful for testing because sourceInfo contains line/column numbers
 * that differ between the actual and expected JSX elements since they're
 * defined at different locations in the source file.
 */
export function stripSourceInfo<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => stripSourceInfo(item)) as T;
    }

    if (typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(obj)) {
            if (key === "sourceInfo") {
                continue; // Skip sourceInfo property
            }
            result[key] = stripSourceInfo((obj as Record<string, unknown>)[key]);
        }
        return result as T;
    }

    return obj;
}
